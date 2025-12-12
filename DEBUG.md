# Debugging Guide for Vercel Deployment

## Quick Checklist

When `/chemistry/fact` works in Postman but not from frontend:

### 1. Check CORS Configuration in Vercel

**Go to**: Vercel Dashboard → Your Project → Settings → Environment Variables

**Verify these are set**:
```
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-domain.vercel.app
HF_TOKEN=hf_your_token_here
```

**Important**:
- `CORS_ORIGINS` must include the **exact** frontend domain
- Include the protocol: `https://`
- No trailing slashes
- Multiple domains: comma-separated, no spaces
- Example: `https://horizontal-journal.vercel.app,https://another-domain.com`

### 2. Check Vercel Function Logs

**Go to**: Vercel Dashboard → Your Project → Functions tab

**Look for**:
- Request logs showing method, path, and origin
- CORS configuration logs
- Any error messages with request IDs
- Controller and service logs

**What to look for**:
```
[Vercel] Environment: { NODE_ENV: 'production', CORS_ORIGINS: [...] }
[Vercel] CORS Config: { origin: [...], methods: [...] }
[POST /chemistry/fact] Request received
```

### 3. Test from Browser Console

Open browser console on your frontend and run:

```javascript
fetch('https://your-backend.vercel.app/chemistry/fact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt: 'test' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Check the error message**:
- CORS error? → Check `CORS_ORIGINS` in Vercel
- 404? → Check route configuration
- 500? → Check function logs for detailed error

### 4. Verify Frontend Request

**Check the request being sent**:
- Open browser DevTools → Network tab
- Make the request from your frontend
- Check the request headers:
  - `Origin`: Should match what's in `CORS_ORIGINS`
  - `Content-Type`: Should be `application/json`

### 5. Common Issues

| Issue | Solution |
|-------|----------|
| CORS error in browser | Add frontend domain to `CORS_ORIGINS` in Vercel |
| 404 Not Found | Check `vercel.json` routing configuration |
| 500 Internal Server Error | Check function logs, verify `HF_TOKEN` is set |
| Request not reaching endpoint | Check Vercel function logs for request logs |
| Works locally but not on Vercel | Verify `NODE_ENV=production` is set |

## Logging Added

The following logs are now available in Vercel Function Logs:

1. **Request Logging**: Every request logs method, path, origin, and headers
2. **CORS Configuration**: Logs the CORS settings on app initialization
3. **Controller Logs**: Logs when `/chemistry/fact` is called with request details
4. **Service Logs**: Logs Hugging Face API calls and responses
5. **Error Logs**: Detailed error logging with stack traces

## Next Steps After Deployment

1. **Deploy the updated code** with logging
2. **Check Vercel Function Logs** when making a request from frontend
3. **Look for the origin** in the logs - it should match your frontend domain
4. **Verify CORS_ORIGINS** includes that exact origin
5. **If still failing**, share the logs for further debugging

