Full-Stack Multi-Vendor Marketplace Specification
1. Project Overview
A comprehensive e-commerce ecosystem allowing multiple independent vendors to sell products on a single platform. The system features a three-way architecture: User (Buyer), Vendor (Seller), and Admin (Moderator).

2. Technical Stack
Backend: Django 5.x + Django REST Framework (DRF)

Database: PostgreSQL 18+ (Database: ecommerce_db)

Authentication: JWT (SimpleJWT) with Role-Based Access Control (RBAC)

Frontend: React.js (Vite) + Tailwind CSS

Image Handling: Pillow + Django Media Storage

3. Detailed Features & Functionality
👤 User (Customer) Side
Authentication: Registration, Login, and Profile Management.

Product Discovery: * Browse products by category.

Search functionality.

Detailed product views (Images, price, vendor info, stock).

Cart & Checkout:

Add/Remove items to a persistent cart.

Place orders (handling multiple products from different vendors in one checkout).

Orders: View personal order history and real-time tracking of order status.

🏪 Vendor (Seller) Side
Onboarding: Registration as a vendor (defaults to is_approved=False).

Product CRUD: * Add new products with images, descriptions, and categories.

Update existing product details and stock levels.

Delete products from their specific inventory.

Order Management: * View orders specifically containing their products.

Update order status (e.g., Processing -> Shipped).

Financials: Dedicated view to see total sales and calculated earnings.

🛡️ Admin (Platform Owner) Side
Vendor Moderation: Approve or reject vendor applications to grant/revoke selling rights.

Management: Complete oversight to edit/delete any user, vendor, or product.

Global Logistics: View every order placed on the platform across all vendors.

Analytics Dashboard: High-level metrics showing total users, active vendors, platform revenue, and order volume.

4. Logical Workflow (The "Flow")
Registration: Users/Vendors sign up. Vendors are restricted until Admin approval.

Inventory: Approved Vendors upload products.

Transaction: User adds items to cart and hits "Place Order."

Order Splitting: The backend creates a primary Order and separate OrderItems. Each OrderItem is assigned to its respective Vendor.

Fulfillment: Vendors see only their items, process them, and update the status.

Completion: User receives the product; Admin monitors the transaction fee/cut.

5. Database Schema (For Cursor's Reference)
CustomUser: email, password, role (ADMIN, VENDOR, CUSTOMER).

VendorProfile: user_id (FK), store_name, is_approved, earnings.

Product: vendor_id (FK), name, description, price, category, stock, image.

Order: customer_id (FK), total_price, status, created_at.

OrderItem: order_id (FK), product_id (FK), vendor_id (FK), quantity, price.

Detailed Implementation Roadmap
Phase 1: Authentication & Role-Based Access Control (RBAC)
Goal: Establish the user system and secure the API.

Backend Tasks:

Initialize Django with User extending AbstractUser.

Roles: Create a Role field or boolean flags (is_vendor, is_customer).

JWT Integration: Configure SimpleJWT for /api/token/ (Login) and /api/token/refresh/.

Registration API: Create an endpoint that accepts email, password, and role.

Signals: Write a post_save signal that automatically creates a VendorProfile if the user is a vendor.

Frontend Tasks:

Setup Vite + React.

Create AuthContext to store the JWT and user role globally.

Build Login and Register pages with validation.

Implement Axios Interceptors to attach the Authorization: Bearer <token> header to all requests.

Phase 2: Vendor Onboarding & Product Management
Goal: Allow vendors to set up shop and list items.

Backend Tasks:

Admin Approval: Create a Patch endpoint for Admins to toggle is_approved in VendorProfile.

Permissions: Write a custom DRF permission IsApprovedVendor.

Product CRUD: Endpoints for GET (all), POST (create), PUT (update), and DELETE.

Image Logic: Configure MEDIA_URL and Pillow for product image uploads.

Frontend Tasks:

Vendor Dashboard: A "My Products" table with Edit/Delete buttons.

Product Form: A multi-part form (with file upload) for adding items.

Access Guard: Redirect vendors to a "Pending Approval" screen if is_approved is false.

Phase 3: Customer Experience & Shopping Cart
Goal: Build the public-facing storefront.

Backend Tasks:

Product Feed: Public GET endpoint for products with filtering (by category) and search.

Category API: Endpoint to fetch list of all categories for the sidebar.

Frontend Tasks:

Home Page: Product grid with "Add to Cart" buttons.

Product Detail Page: Showing description, stock status, and vendor name.

Cart Logic: Use localStorage or Redux to manage the cart state.

Cart View: A page to review items, update quantities, and see the total price.

Phase 4: Order Splitting & Vendor Fulfillment
Goal: The core marketplace logic—handling complex transactions.

Backend Tasks:

Checkout API: A POST request to /api/orders/checkout/.

Atomic Transaction: Logic must create 1 Order entry AND multiple OrderItem entries. Each OrderItem must be linked to its specific VendorID.

Stock Management: Decrease product stock count upon successful order.

Vendor Order View: A GET endpoint for vendors to see only the OrderItems belonging to them.

Frontend Tasks:

Checkout Page: Address form and order summary.

Order Success: A "Thank You" page with the order ID.

Vendor Fulfillment UI: A dashboard where vendors can click "Mark as Shipped" on specific items.

Phase 5: Admin Oversight & Analytics
Goal: Platform management and data visualization.

Backend Tasks:

Admin Analytics: Endpoints returning: Total Revenue, Total Orders, Total Registered Users.

Vendor Management: A list view for admins to see all vendors and their approval status.

Frontend Tasks:

Admin Dashboard: High-level cards showing stats and a table for "New Vendor Requests."

User/Order Management: Ability to see every order on the platform for customer support.

Phase 6: Final Polish & Security
Backend: Set up CORS_ALLOWED_ORIGINS. Use Environment Variables for database credentials.

Frontend: Add "Loading" spinners and Toast notifications (e.g., "Product added to cart!").

Deployment Ready: Ensure all static and media files are configured for a production server.

