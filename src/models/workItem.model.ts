import pool from '../config/database';
import { WorkItemResponse, CreateWorkItemDto, UpdateWorkItemDto } from '../types/work.types';

class WorkItemModel {
  private mapToWorkItemResponse(row: any): WorkItemResponse {
    // Format date to avoid timezone issues
    const formatDate = (date: Date | string | null): string | undefined => {
      if (!date) return undefined;
      
      // If it's already a string in YYYY-MM-DD format, return as is
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // If it's a Date object, format using UTC methods to avoid timezone conversion
      // PostgreSQL DATE type doesn't have time, so we use UTC methods
      const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
      
      // Use UTC date methods to avoid timezone conversion
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      id: row.id,
      name: row.name,
      productCode: row.product_code || undefined,
      size: row.size || undefined,
      shape: row.shape || undefined,
      description: row.description || undefined,
      difficultyLevel: row.difficulty_level,
      pricePerWeld: parseFloat(row.price_per_weld),
      totalQuantity: parseInt(row.total_quantity || 0),
      weldsPerItem: parseInt(row.welds_per_item || 0),
      status: (row.status || 'Tạo mới') as 'Tạo mới' | 'Đang sản xuất' | 'Hoàn thành',
      estimatedDeliveryDate: row.estimated_delivery_date_str || formatDate(row.estimated_delivery_date),
      weight: row.weight_kg !== null && row.weight_kg !== undefined ? parseFloat(row.weight_kg) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async getExistingSizesForSequence(
    year: number,
    month: number,
    sequence: number
  ): Promise<string[]> {
    const sequences = await this.getSequencesInMonth(year, month);
    const found = sequences.find((s) => s.sequence === sequence);
    return found ? found.sizes : [];
  }

  private async getNextSequenceNumber(year: number, month: number): Promise<number> {
    // Query to get max STT in the month (format: YYMM%)
    const query = `
      SELECT product_code 
      FROM work_items 
      WHERE product_code LIKE $1 AND product_code IS NOT NULL
      ORDER BY product_code DESC 
      LIMIT 1
    `;
    
    const prefix = `${year.toString().slice(-2)}${month.toString().padStart(2, '0')}`;
    const pattern = `${prefix}%`;
    const result = await pool.query(query, [pattern]);
    
    if (result.rows.length === 0) {
      return 1; // First product of the month
    }
    
    // Parse: 260105A -> extract sequence number (5)
    // Remove YYMM (4 chars) and last char (size) -> get middle number
    const lastCode = result.rows[0].product_code;
    const withoutPrefix = lastCode.substring(4); // Remove YYMM
    const sequenceStr = withoutPrefix.substring(0, withoutPrefix.length - 1); // Remove size letter
    const lastSeq = parseInt(sequenceStr);
    
    return lastSeq + 1;
  }

  private generateProductCode(year: number, month: number, sequence: number, size: string): string {
    const yy = year.toString().slice(-2);
    const mm = month.toString().padStart(2, '0');
    const seq = sequence.toString().padStart(2, '0');
    return `${yy}${mm}${seq}${size}`;
  }

  private generateName(productCode: string, description?: string, shape?: string): string {
    // Smart concatenation - only include non-empty parts
    const nameParts = ['Mã:', productCode];
    if (description && description.trim()) {
      nameParts.push(description.trim());
    }
    if (shape && shape.trim()) {
      nameParts.push(shape);
    }
    return nameParts.join(' ');
  }

  async getSequencesInMonth(year: number, month: number): Promise<Array<{
    sequence: number;
    sizes: string[];
    productCodes: string[];
    description?: string;
    shape?: string;
  }>> {
    const prefix = `${year.toString().slice(-2)}${month.toString().padStart(2, '0')}`;
    const pattern = `${prefix}%`;
    
    const query = `
      SELECT product_code, size, description, shape
      FROM work_items
      WHERE product_code LIKE $1 AND product_code IS NOT NULL
      ORDER BY product_code DESC
    `;
    
    const result = await pool.query(query, [pattern]);
    
    // Group by sequence number
    const sequenceMap = new Map<number, { 
      sizes: string[]; 
      productCodes: string[];
      descriptions: Set<string>;
      shapes: Set<string>;
    }>();
    
    result.rows.forEach(row => {
      const code = row.product_code;
      const withoutPrefix = code.substring(4);
      const seqStr = withoutPrefix.substring(0, withoutPrefix.length - 1);
      const seq = parseInt(seqStr);
      
      if (!sequenceMap.has(seq)) {
        sequenceMap.set(seq, { 
          sizes: [], 
          productCodes: [], 
          descriptions: new Set(), 
          shapes: new Set() 
        });
      }
      
      const data = sequenceMap.get(seq)!;
      data.sizes.push(row.size);
      data.productCodes.push(code);
      if (row.description) data.descriptions.add(row.description);
      if (row.shape) data.shapes.add(row.shape);
    });
    
    return Array.from(sequenceMap.entries())
      .map(([seq, data]) => ({
        sequence: seq,
        sizes: data.sizes,
        productCodes: data.productCodes,
        description: Array.from(data.descriptions)[0], // First item's description
        shape: Array.from(data.shapes)[0] // First item's shape
      }))
      .sort((a, b) => b.sequence - a.sequence); // Sort DESC (newest first)
  }

  async getAllWorkItems(difficultyLevel?: string): Promise<WorkItemResponse[]> {
    let query = 'SELECT *, TO_CHAR(estimated_delivery_date, \'YYYY-MM-DD\') as estimated_delivery_date_str FROM work_items';
    const values: any[] = [];

    if (difficultyLevel) {
      query += ' WHERE difficulty_level = $1';
      values.push(difficultyLevel);
    }

    query += ' ORDER BY difficulty_level, name';

    const result = await pool.query(query, values);
    const workItems = result.rows.map((row) => this.mapToWorkItemResponse(row));
    
    // Calculate quantityMade for each work item
    const workItemsWithQuantity = await Promise.all(
      workItems.map(async (item) => {
        try {
          // Lazy import to avoid circular dependency
          const workRecordModel = (await import('./workRecord.model')).default;
          const quantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(item.id);
          return { ...item, quantityMade };
        } catch (error) {
          console.error(`Error fetching quantity made for work item ${item.id}:`, error);
          return { ...item, quantityMade: 0 };
        }
      })
    );
    
    return workItemsWithQuantity;
  }

  async getWorkItemById(id: string): Promise<WorkItemResponse | null> {
    const result = await pool.query('SELECT *, TO_CHAR(estimated_delivery_date, \'YYYY-MM-DD\') as estimated_delivery_date_str FROM work_items WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const workItem = this.mapToWorkItemResponse(result.rows[0]);
    
    // Calculate quantityMade
    try {
      // Lazy import to avoid circular dependency
      const workRecordModel = (await import('./workRecord.model')).default;
      const quantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(id);
      return { ...workItem, quantityMade };
    } catch (error) {
      console.error(`Error fetching quantity made for work item ${id}:`, error);
      return { ...workItem, quantityMade: 0 };
    }
  }

  async createWorkItem(workItemData: CreateWorkItemDto): Promise<WorkItemResponse[]> {
    const { description, shape, sizes, existingSequence, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate, weight } = workItemData;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const createdItems: WorkItemResponse[] = [];
    let sequence: number;
    let sizesToCreate: string[];

    if (existingSequence) {
      // When adding to existing sequence: filter out sizes that already exist
      sequence = existingSequence;
      const existingSizes = await this.getExistingSizesForSequence(year, month, existingSequence);
      sizesToCreate = sizes.filter((s) => !existingSizes.includes(s));
      if (sizesToCreate.length === 0) {
        throw new Error(`Tất cả cỡ đã chọn (${sizes.join(', ')}) đã tồn tại cho STT ${existingSequence}. Vui lòng chọn cỡ khác.`);
      }
    } else {
      // New sequence: retry with next sequence if duplicate key
      sizesToCreate = sizes;
      sequence = await this.getNextSequenceNumber(year, month);
      const maxRetries = 10;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await this.insertWorkItemsForSizes(
            year, month, sequence, sizesToCreate,
            description, shape, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate, weight
          );
        } catch (err: any) {
          if (err.code === '23505' && attempt < maxRetries - 1) {
            // Duplicate key: try next sequence (getNextSequenceNumber returns same value if no new data)
            sequence += 1;
            continue;
          }
          throw err;
        }
      }
      throw new Error('Không thể tạo mã sản phẩm. Vui lòng thử lại.');
    }
    
    return await this.insertWorkItemsForSizes(
      year, month, sequence, sizesToCreate,
      description, shape, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate, weight
    );
  }

  private async insertWorkItemsForSizes(
    year: number,
    month: number,
    sequence: number,
    sizes: string[],
    description?: string,
    shape?: string,
    difficultyLevel?: string,
    pricePerWeld?: number,
    totalQuantity?: number,
    weldsPerItem?: number,
    estimatedDeliveryDate?: string,
    weight?: number
  ): Promise<WorkItemResponse[]> {
    const createdItems: WorkItemResponse[] = [];
    for (const size of sizes) {
      const productCode = this.generateProductCode(year, month, sequence, size);
      const name = this.generateName(productCode, description, shape);
      
      const result = await pool.query(
        `INSERT INTO work_items (name, product_code, size, shape, description, difficulty_level, price_per_weld, total_quantity, welds_per_item, status, estimated_delivery_date, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Tạo mới', $10, $11)
         RETURNING *, TO_CHAR(estimated_delivery_date, 'YYYY-MM-DD') as estimated_delivery_date_str`,
        [
          name, 
          productCode, 
          size, 
          shape || null, 
          description || null, 
          difficultyLevel, 
          pricePerWeld, 
          totalQuantity, 
          weldsPerItem, 
          estimatedDeliveryDate || null, 
          weight !== undefined ? weight : null
        ]
      );

      const workItem = this.mapToWorkItemResponse(result.rows[0]);
      // New work item has 0 quantity made
      createdItems.push({ ...workItem, quantityMade: 0 });
      
      // DO NOT increment sequence - all sizes share same STT
    }
    
    return createdItems;
  }

  async updateWorkItem(id: string, workItemData: UpdateWorkItemDto): Promise<WorkItemResponse | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Check if we need to regenerate name (when description or shape changes)
    let needsNameRegeneration = false;
    
    if (workItemData.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(workItemData.description || null);
      paramCount++;
      needsNameRegeneration = true;
    }

    if (workItemData.shape !== undefined) {
      updates.push(`shape = $${paramCount}`);
      values.push(workItemData.shape || null);
      paramCount++;
      needsNameRegeneration = true;
    }

    // Note: name is NOT directly updatable
    // It will be regenerated after description/shape update

    if (workItemData.difficultyLevel !== undefined) {
      updates.push(`difficulty_level = $${paramCount}`);
      values.push(workItemData.difficultyLevel);
      paramCount++;
    }

    if (workItemData.pricePerWeld !== undefined) {
      updates.push(`price_per_weld = $${paramCount}`);
      values.push(workItemData.pricePerWeld);
      paramCount++;
    }

    if (workItemData.totalQuantity !== undefined) {
      updates.push(`total_quantity = $${paramCount}`);
      values.push(workItemData.totalQuantity);
      paramCount++;
    }

    if (workItemData.weldsPerItem !== undefined) {
      updates.push(`welds_per_item = $${paramCount}`);
      values.push(workItemData.weldsPerItem);
      paramCount++;
    }

    if (workItemData.status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(workItemData.status);
      paramCount++;
    }

    if (workItemData.estimatedDeliveryDate !== undefined) {
      updates.push(`estimated_delivery_date = $${paramCount}`);
      values.push(workItemData.estimatedDeliveryDate || null);
      paramCount++;
    }

    if (workItemData.weight !== undefined) {
      updates.push(`weight_kg = $${paramCount}`);
      values.push(workItemData.weight !== null && workItemData.weight !== undefined ? workItemData.weight : null);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.getWorkItemById(id);
    }

    values.push(id);
    const query = `
      UPDATE work_items 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *, TO_CHAR(estimated_delivery_date, 'YYYY-MM-DD') as estimated_delivery_date_str
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    let workItem = this.mapToWorkItemResponse(result.rows[0]);
    
    // Regenerate name if description or shape was updated
    if (needsNameRegeneration && workItem.productCode) {
      const newName = this.generateName(
        workItem.productCode,
        workItem.description,
        workItem.shape
      );
      
      await pool.query(
        'UPDATE work_items SET name = $1 WHERE id = $2',
        [newName, id]
      );
      
      workItem = { ...workItem, name: newName };
    }
    
    // Calculate quantityMade
    try {
      // Lazy import to avoid circular dependency
      const workRecordModel = (await import('./workRecord.model')).default;
      const quantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(id);
      
      // If totalQuantity was updated, recalculate status using the new totalQuantity
      if (workItemData.totalQuantity !== undefined) {
        await this.updateWorkItemStatus(id, workItemData.totalQuantity).catch((error) => {
          console.error('Error updating work item status after totalQuantity change:', error);
        });
        
        // Re-fetch work item to get updated status after updateWorkItemStatus
        const updatedWorkItem = await this.getWorkItemById(id);
        if (updatedWorkItem) {
          return { ...updatedWorkItem, quantityMade };
        }
      }
      
      return { ...workItem, quantityMade };
    } catch (error) {
      console.error(`Error fetching quantity made for work item ${id}:`, error);
      return { ...workItem, quantityMade: 0 };
    }
  }

  async deleteWorkItem(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM work_items WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async updateWorkItemStatus(workItemId: string, totalQuantity?: number): Promise<void> {
    // Get work item to access totalQuantity if not provided
    let workItem: WorkItemResponse | null = null;
    let finalTotalQuantity: number;
    
    if (totalQuantity !== undefined) {
      // Use provided totalQuantity (from update)
      finalTotalQuantity = totalQuantity;
    } else {
      // Get work item to access totalQuantity
      workItem = await this.getWorkItemById(workItemId);
      if (!workItem) {
        return;
      }
      finalTotalQuantity = workItem.totalQuantity;
    }

    // Lazy import to avoid circular dependency
    const workRecordModel = (await import('./workRecord.model')).default;
    
    // Calculate totalQuantityMade using workRecord model
    const totalQuantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(workItemId);

    // Determine status based on totalQuantityMade vs totalQuantity
    let newStatus: 'Tạo mới' | 'Đang sản xuất' | 'Hoàn thành';
    if (totalQuantityMade >= finalTotalQuantity) {
      newStatus = 'Hoàn thành';
    } else if (totalQuantityMade > 0) {
      newStatus = 'Đang sản xuất';
    } else {
      newStatus = 'Tạo mới';
    }

    // Update status in database
    await pool.query(
      'UPDATE work_items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, workItemId]
    );
  }
}

export default new WorkItemModel();

