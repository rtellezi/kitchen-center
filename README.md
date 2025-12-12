# Kitchen Center API

Optimized NestJS backend for Vercel deployment with two endpoints: health check and chemistry fact generation.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file for development:
   ```bash
   cp sample.env .env.development
   ```
   Then edit `.env.development` and add your `HF_TOKEN`.

3. Run locally:
   ```bash
   npm run start:dev
   ```
   The API will be available at `http://localhost:3000`.

## Configuration

### Development Environment

Create `.env.development` (or copy from `sample.env`):
- `HF_TOKEN`: Your Hugging Face API token (required)
- `CORS_ORIGINS`: Optional in dev (allows all origins if not set)
- Other `HF_*` variables: Optional (have sensible defaults)

### Production Environment

Set environment variables in Vercel Project Settings:
- `NODE_ENV=production`
- `HF_TOKEN`: Your Hugging Face API token (required)
- `CORS_ORIGINS`: **Required** - comma-separated list of allowed frontend domains
- Other `HF_*` variables: Optional (have sensible defaults)

**Important**: In production, CORS is restricted to only the origins you specify. Make sure to add your frontend domain(s).

## API Endpoints

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-01-10T10:00:00.000Z",
    "service": "kitchen-center"
  }
  ```

### Chemistry Fact Generation
- **URL**: `/chemistry/fact`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "prompt": "Generate a fact about the psychology of love."
  }
  ```
- **Response**:
  ```json
  {
    "fact": "Falling in love triggers dopamine pathways..."
  }
  ```

## Deployment to Vercel

1. **Push to Git**: Ensure code is pushed to a Git repository.

2. **Import in Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." -> "Project"
   - Select your Git repository
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables (see Production Environment above)
   - **Important**: Set `NODE_ENV=production` and configure `CORS_ORIGINS`

4. **Deploy**: Click "Deploy"

## CORS Configuration

- **Development**: Allows all origins (for local testing)
- **Production**: Only allows origins specified in `CORS_ORIGINS` environment variable

## Troubleshooting

1. **Endpoints not accessible**: Check Vercel Function Logs for errors
2. **CORS errors in production**: Verify `CORS_ORIGINS` includes your frontend domain
3. **Build fails**: Check build logs in Vercel Dashboard
4. **Missing HF_TOKEN**: Ensure environment variable is set in Vercel
