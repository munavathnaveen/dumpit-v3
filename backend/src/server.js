const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const colors = require('colors')
const config = require('./config')
const connectDB = require('./utils/database')
const errorHandler = require('./middleware/error')

// Initialize Express app
const app = express()

// Connect to database
connectDB()

// Body parser middleware
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// Cookie parser
app.use(cookieParser())

// Security middleware
app.use(helmet())

// Enable CORS
app.use(cors())

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use(
    morgan((tokens, req, res) => {
      return [
        colors.cyan(tokens.method(req, res)),
        colors.yellow(tokens.url(req, res)),
        colors.green(tokens.status(req, res)),
        colors.red(tokens['response-time'](req, res) + ' ms'),
      ].join(' ')
    })
  )
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
})
app.use('/api', limiter)

// Routes
// Import and use route files
app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/users', require('./routes/users'))
app.use('/api/v1/addresses', require('./routes/addresses'))
app.use('/api/v1/products', require('./routes/products'))
app.use('/api/v1/shops', require('./routes/shops'))
app.use('/api/v1/cart', require('./routes/cart'))
app.use('/api/v1/orders', require('./routes/orders'))
app.use('/api/v1/coupons', require('./routes/coupons'))
app.use('/api/v1/analytics', require('./routes/analytics'))
app.use('/api/v1/location', require('./routes/location'))

// Reset Password Route - Redirects to app with deep linking
app.get('/api/v1/auth/resetpassword/:resettoken', (req, res) => {
  const { resettoken } = req.params;
  
  // For web display
  const resetPasswordHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dumpit - Reset Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
        }
        h1 {
          color: #333;
        }
        p {
          margin: 15px 0;
          line-height: 1.5;
          color: #666;
        }
        .logo {
          width: 100px;
          height: 100px;
          margin-bottom: 20px;
        }
        .button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 15px;
          text-decoration: none;
          display: inline-block;
        }
        .button.web {
          background-color: #2196F3;
          margin-top: 30px;
        }
        .footer {
          margin-top: 40px;
          font-size: 12px;
          color: #999;
        }
        .tokenDisplay {
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 5px;
          margin: 15px 0;
          word-break: break-all;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="https://dumpit.app/logo.png" alt="Dumpit Logo" class="logo">
        <h1>Reset Your Password</h1>
        <p>You have requested to reset your password for your Dumpit account.</p>
        
        <p><strong>Option 1:</strong> If you have the Dumpit app installed, click the button below:</p>
        <a href="dumpit://resetpassword/${resettoken}" class="button">Open in Dumpit App</a>
        
        <p><strong>Option 2:</strong> Or you can complete the process on the web:</p>
        <form id="resetPasswordForm" method="POST" action="/api/v1/auth/resetpassword/${resettoken}" style="display: none;">
          <input type="password" name="password" id="password" required>
          <button type="submit">Reset Password</button>
        </form>
        <a href="#" onclick="showPasswordForm()" class="button web">Reset via Web</a>
        
        <div id="passwordFormContainer" style="display: none; margin-top: 20px;">
          <p>Enter your new password:</p>
          <input type="password" id="passwordInput" style="padding: 10px; width: 100%; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
          <input type="password" id="confirmPasswordInput" style="padding: 10px; width: 100%; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Confirm password">
          <button id="submitButton" style="background-color: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Reset Password</button>
          <p id="errorMessage" style="color: red; display: none;"></p>
        </div>
        
        <p class="footer">If you didn't request this password reset, you can safely ignore this page.</p>
      </div>
      
      <script>
        function showPasswordForm() {
          document.getElementById('passwordFormContainer').style.display = 'block';
        }
        
        document.getElementById('submitButton')?.addEventListener('click', async function() {
          const password = document.getElementById('passwordInput').value;
          const confirmPassword = document.getElementById('confirmPasswordInput').value;
          const errorMessage = document.getElementById('errorMessage');
          
          if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters';
            errorMessage.style.display = 'block';
            return;
          }
          
          if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return;
          }
          
          try {
            const response = await fetch('/api/v1/auth/resetpassword/${resettoken}', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ password }),
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Show success message
              document.querySelector('.container').innerHTML = '<h1>Success!</h1><p>Your password has been reset successfully.</p><p>You can now login with your new password.</p>';
            } else {
              errorMessage.textContent = data.error || 'Failed to reset password';
              errorMessage.style.display = 'block';
            }
          } catch (error) {
            errorMessage.textContent = 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `;
  
  res.send(resetPasswordHtml);
});

// Root route
app.get('/', (req, res) => {
  res.send('Dumpit API Server is running...')
})

// Error handling middleware
app.use(errorHandler)

// Start server
const PORT = config.port
const server = app.listen(PORT, () => {
  console.log(colors.yellow.bold(`Server running in ${config.nodeEnv} mode on port ${PORT}`))
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(colors.red.bold(`Error: ${err.message}`))
  // Close server & exit process
  server.close(() => process.exit(1))
})
