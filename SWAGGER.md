# Swagger/OpenAPI Documentation Guide

## 📄 Overview

This project uses **OpenAPI 3.0** specification defined in a YAML file (`swagger.yaml`) to document all API endpoints.

## 📁 File Structure

```
craft-management/
├── swagger.yaml              # OpenAPI specification file (main documentation)
├── src/
│   └── config/
│       └── swagger.ts        # Loads and serves the YAML file
└── API_DOCUMENTATION.md      # Human-readable API guide
```

## 🔧 How It Works

1. **YAML File**: All API documentation is defined in `swagger.yaml`
2. **Swagger Config**: `src/config/swagger.ts` loads the YAML file
3. **Swagger UI**: Served at `http://localhost:3000/api-docs`
4. **OpenAPI JSON**: Available at `http://localhost:3000/api-docs.json`

## 📝 Editing API Documentation

### Option 1: Edit swagger.yaml Directly (Recommended)

The `swagger.yaml` file is a standard OpenAPI 3.0 specification. You can edit it with:

**Visual Studio Code** (with extensions):
- Install: "OpenAPI (Swagger) Editor" extension
- Install: "YAML" extension
- Right-click `swagger.yaml` → "Preview Swagger"

**Swagger Editor Online**:
1. Go to https://editor.swagger.io/
2. Copy content from `swagger.yaml`
3. Edit in the online editor
4. Copy back to your file

**Direct Editing**:
Just open `swagger.yaml` in any text editor and modify as needed.

### Option 2: Use Swagger Editor Docker

```bash
docker run -p 8080:8080 swaggerapi/swagger-editor
# Then open http://localhost:8080
# Load your swagger.yaml file
```

## 📐 YAML File Structure

```yaml
openapi: 3.0.0
info:                          # API metadata
  title: ...
  version: ...
  description: ...

servers:                       # API servers
  - url: ...
    description: ...

tags:                          # Endpoint categories
  - name: Authentication
  - name: Users
  - name: Health

components:                    # Reusable components
  securitySchemes:            # Authentication methods
    bearerAuth: ...
  schemas:                    # Data models
    User: ...
    RegisterRequest: ...
    LoginRequest: ...

paths:                         # API endpoints
  /api/auth/register:
    post: ...
  /api/auth/login:
    post: ...
  /api/users:
    get: ...
    post: ...
```

## ✏️ Adding a New Endpoint

### Step 1: Add to swagger.yaml

```yaml
paths:
  /api/your-endpoint:
    post:
      summary: Your endpoint summary
      description: Detailed description
      tags:
        - YourTag
      security:
        - bearerAuth: []  # If authentication required
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/YourRequest'
      responses:
        '200':
          description: Success response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/YourResponse'
        '400':
          description: Bad request
```

### Step 2: Add Schema (if needed)

```yaml
components:
  schemas:
    YourRequest:
      type: object
      required:
        - fieldName
      properties:
        fieldName:
          type: string
          example: "example value"
```

### Step 3: No Code Changes Needed!

The YAML file is automatically loaded. Just:
1. Save `swagger.yaml`
2. Restart the server: `npm run dev`
3. Visit `http://localhost:3000/api-docs`

## 🎨 Customizing Swagger UI

Edit `src/app.ts` to customize the Swagger UI:

```typescript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',  // Hide top bar
  customSiteTitle: 'Your API Docs',                    // Browser title
  customfavIcon: '/favicon.ico',                       // Custom favicon
  swaggerOptions: {
    persistAuthorization: true,                        // Remember auth token
    displayRequestDuration: true,                      // Show request time
    filter: true,                                      // Enable filter box
    syntaxHighlight: {
      theme: 'monokai'                                // Code highlight theme
    }
  }
}));
```

## 📦 Exporting Documentation

### Export as JSON

```bash
curl http://localhost:3000/api-docs.json > api-docs.json
```

### Export as HTML

```bash
# Install redoc-cli
npm install -g redoc-cli

# Generate HTML
redoc-cli bundle swagger.yaml -o api-docs.html
```

### Share Online

Upload `swagger.yaml` to:
- **Swagger Hub**: https://app.swaggerhub.com/
- **Stoplight**: https://stoplight.io/
- **ReadMe**: https://readme.com/

## 🔍 Validating swagger.yaml

### Online Validator

https://apitools.dev/swagger-parser/online/

### CLI Validator

```bash
npm install -g @apidevtools/swagger-cli

swagger-cli validate swagger.yaml
```

### VS Code Extension

Install "Swagger Viewer" extension - it will show validation errors inline.

## 🌟 Best Practices

1. **Use $ref for Reusability**
   ```yaml
   schema:
     $ref: '#/components/schemas/User'
   ```

2. **Add Examples**
   ```yaml
   example: "user@example.com"
   ```

3. **Document All Responses**
   - Success (200, 201)
   - Client errors (400, 401, 404, 409)
   - Server errors (500)

4. **Use Descriptive Names**
   - Good: `UserRegistrationRequest`
   - Bad: `Request1`

5. **Keep It Updated**
   - Update YAML when adding/changing endpoints
   - Sync with actual API behavior

## 🚀 Testing with Swagger UI

### 1. Start Server

```bash
npm run dev
```

### 2. Open Swagger UI

```
http://localhost:3000/api-docs
```

### 3. Authenticate

1. Register or login to get a token
2. Click "Authorize" button (🔒)
3. Enter: `Bearer YOUR_TOKEN`
4. Click "Authorize"

### 4. Test Endpoints

1. Expand an endpoint
2. Click "Try it out"
3. Edit parameters/body
4. Click "Execute"
5. See response

## 📚 Additional Resources

- **OpenAPI Specification**: https://swagger.io/specification/
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **OpenAPI Guide**: https://oai.github.io/Documentation/
- **YAML Tutorial**: https://learnxinyminutes.com/docs/yaml/

## 💡 Tips

- Use YAML anchors for repetitive content
- Validate before committing
- Keep descriptions clear and concise
- Add examples for all schemas
- Document authentication clearly
- Test all documented endpoints

## 🐛 Troubleshooting

### Swagger UI shows empty page
- Check browser console for errors
- Validate `swagger.yaml` syntax
- Restart the server

### Changes not showing
- Clear browser cache (Ctrl+F5)
- Restart server
- Check file path in `swagger.ts`

### Authentication not working
- Check token format: `Bearer YOUR_TOKEN`
- Verify token is valid
- Check `securitySchemes` in YAML

---

For more information, see:
- [README.md](README.md)
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [SETUP.md](SETUP.md)

