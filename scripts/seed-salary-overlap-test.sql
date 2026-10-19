BEGIN;

-- Cleanup previous test data if re-run
DELETE FROM monthly_salaries WHERE employee_id IN (
  SELECT id FROM employees WHERE email IN ('test.overlap@example.com', 'test.clean@example.com')
);
DELETE FROM work_records WHERE employee_id IN (
  SELECT id FROM employees WHERE email IN ('test.overlap@example.com', 'test.clean@example.com')
);
DELETE FROM employees WHERE email IN ('test.overlap@example.com', 'test.clean@example.com');

WITH refs AS (
  SELECT
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1) AS admin_id,
    (SELECT id FROM work_types WHERE name = 'Thợ Hàn' LIMIT 1) AS work_type_id,
    (SELECT id FROM work_items ORDER BY created_at DESC LIMIT 1) AS work_item_id
),
emp_overlap AS (
  INSERT INTO employees (first_name, last_name, employee_id, status, department, email, position, hire_date)
  VALUES ('Test', 'Overlap', 'EMP-TEST-OVERLAP', 'active', 'QA', 'test.overlap@example.com', 'Tester', '2026-01-01')
  RETURNING id
),
emp_clean AS (
  INSERT INTO employees (first_name, last_name, employee_id, status, department, email, position, hire_date)
  VALUES ('Test', 'Clean', 'EMP-TEST-CLEAN', 'active', 'QA', 'test.clean@example.com', 'Tester', '2026-01-01')
  RETURNING id
),
wr_overlap AS (
  INSERT INTO work_records (
    id, employee_id, work_date, work_type_id, work_item_id,
    quantity, unit_price, total_amount, notes, created_by, status, has_overtime
  )
  SELECT
    v.id,
    (SELECT id FROM emp_overlap),
    v.work_date,
    (SELECT work_type_id FROM refs),
    (SELECT work_item_id FROM refs),
    10,
    1000,
    10000,
    v.note,
    (SELECT admin_id FROM refs),
    'Tạo mới',
    false
  FROM (VALUES
    ('11111111-1111-4111-8111-111111111101'::uuid, '2026-11-01'::date, 'TEST-OVERLAP WR1'),
    ('11111111-1111-4111-8111-111111111102'::uuid, '2026-11-02'::date, 'TEST-OVERLAP WR2 (shared)'),
    ('11111111-1111-4111-8111-111111111103'::uuid, '2026-11-03'::date, 'TEST-OVERLAP WR3 (shared)'),
    ('11111111-1111-4111-8111-111111111104'::uuid, '2026-11-04'::date, 'TEST-OVERLAP WR4'),
    ('11111111-1111-4111-8111-111111111105'::uuid, '2026-11-05'::date, 'TEST-OVERLAP WR5')
  ) AS v(id, work_date, note)
  RETURNING id
),
wr_clean AS (
  INSERT INTO work_records (
    id, employee_id, work_date, work_type_id, work_item_id,
    quantity, unit_price, total_amount, notes, created_by, status, has_overtime
  )
  SELECT
    v.id,
    (SELECT id FROM emp_clean),
    v.work_date,
    (SELECT work_type_id FROM refs),
    (SELECT work_item_id FROM refs),
    5,
    2000,
    10000,
    v.note,
    (SELECT admin_id FROM refs),
    'Tạo mới',
    false
  FROM (VALUES
    ('22222222-2222-4222-8222-222222222201'::uuid, '2026-11-10'::date, 'TEST-CLEAN WR1'),
    ('22222222-2222-4222-8222-222222222202'::uuid, '2026-11-11'::date, 'TEST-CLEAN WR2')
  ) AS v(id, work_date, note)
  RETURNING id
),
slip_a AS (
  INSERT INTO monthly_salaries (
    id, employee_id, year, month, date_from, date_to,
    total_work_days, total_amount, allowances, advance_payment, status, calculated_at
  )
  VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    (SELECT id FROM emp_overlap),
    2026, 11, '2026-11-01', '2026-11-03',
    3, 30000, 30000, 0, 'Tạm tính', NOW()
  )
  RETURNING id
),
slip_b AS (
  INSERT INTO monthly_salaries (
    id, employee_id, year, month, date_from, date_to,
    total_work_days, total_amount, allowances, advance_payment, status, calculated_at
  )
  VALUES (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    (SELECT id FROM emp_overlap),
    2026, 11, '2026-11-02', '2026-11-05',
    4, 40000, 40000, 0, 'Tạm tính', NOW()
  )
  RETURNING id
),
j_a AS (
  INSERT INTO monthly_salary_work_records (monthly_salary_id, work_record_id)
  VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111101'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111102'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111103')
  RETURNING 1
),
j_b AS (
  INSERT INTO monthly_salary_work_records (monthly_salary_id, work_record_id)
  VALUES
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111102'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111103'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111104'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111105')
  RETURNING 1
),
slip_clean AS (
  INSERT INTO monthly_salaries (
    id, employee_id, year, month, date_from, date_to,
    total_work_days, total_amount, allowances, advance_payment, status, calculated_at
  )
  VALUES (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    (SELECT id FROM emp_clean),
    2026, 11, '2026-11-10', '2026-11-11',
    2, 20000, 20000, 0, 'Tạm tính', NOW()
  )
  RETURNING id
),
j_clean AS (
  INSERT INTO monthly_salary_work_records (monthly_salary_id, work_record_id)
  VALUES
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '22222222-2222-4222-8222-222222222201'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '22222222-2222-4222-8222-222222222202')
  RETURNING 1
)
SELECT 1;

COMMIT;
