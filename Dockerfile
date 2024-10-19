# Step 1: Build the Angular application
FROM node:16-alpine AS build

# Set working directory
WORKDIR /app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Angular app in production mode
RUN npm run build --prod

# Step 2: Set up nginx and copy the build output

# Use an official nginx image to serve the Angular app
FROM nginx:alpine

# Copy the nginx configuration file (optional, you can add custom settings here)
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the Angular build output to the nginx html directory
COPY --from=build /app/dist/tradingview-angular-app /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
