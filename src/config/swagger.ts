import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Load swagger.yaml file
const swaggerYamlPath = path.join(__dirname, '../../swagger.yaml');
const swaggerYaml = fs.readFileSync(swaggerYamlPath, 'utf8');
const swaggerSpec = yaml.load(swaggerYaml) as Record<string, any>;

export default swaggerSpec;

