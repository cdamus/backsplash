# Node.js
FROM node:20-alpine AS build

# Copy Backplash application package metadata
COPY package*.json .

# Install dependencies
RUN npm ci

# Copy scripts into workdir
COPY . .

# Build the Backsplash application
RUN npm run build

# Use lightweight web server to serve the build
FROM nginx:alpine
COPY --from=build /dist /usr/share/nginx/html

# Port mapping
EXPOSE 80

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
