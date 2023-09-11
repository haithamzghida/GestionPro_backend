const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitrine'
});

connection.connect((err) => {
  if (err) {
    console.log('Erreur de connexion à la base de données MySQL:', err);
  } else {
    console.log('Connexion réussie à la base de données MySQL');
  }
});

// Route pour récupérer tous les produits
app.get('/products', (req, res) => {
    connection.query('SELECT * FROM products', (err, rows) => {
      if (err) {
        console.log('Erreur de récupération des produits:', err);
        res.sendStatus(500);
      } else {
        const products = rows.map(product => {
            return {
              ...product,
              price: parseInt(product.price)
            }
          });
          res.json({ products });
      }
    });
  });

  // Route pour créer un nouveau compte client
// Route pour créer un nouveau compte client avec validation d'email et de mot de passe
app.post('/customers', (req, res) => {
  const { full_name, email, password } = req.body;
  
  // Vérification que le nom est présent
  if (!full_name) {
      res.status(400).json({ error: 'Full name is required' });
      return;
  }

  // Vérification que l'email est présent et valide
  if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
  }

  // Vérification que le mot de passe est présent et valide
  if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
  }

  const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updated_at = created_at;

  const query = 'INSERT INTO customers (full_name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [full_name, email, password, created_at, updated_at], (error, results, fields) => {
      if (error) {
          console.log('Error creating customer:', error);
          res.status(500).json({ error: 'Error creating customer' });
      } else {
          res.json({ message: 'Customer created successfully' });
      }
  });
});



// Route pour récupérer les produits par catégorie
app.get('/products/category/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;
  connection.query('SELECT * FROM products WHERE category_id = ?', [categoryId], (err, rows) => {
    if (err) {
      console.log('Erreur de récupération des produits par catégorie:', err);
      res.sendStatus(500);
    } else {
      const products = rows.map(product => {
        return {
          ...product,
          price: parseInt(product.price)
        }
      });
      res.json({ products });
    }
  });
});


// Route to add products in panier for a customer
app.post('/panier', (req, res) => {
  const { customer_id, product_id, quantity } = req.body;
  const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updated_at = created_at;

  const query = 'INSERT INTO panier (customer_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [customer_id, product_id, quantity, created_at, updated_at], (error, results, fields) => {
    if (error) {
      console.log('Error adding product to panier:', error);
      res.sendStatus(500);
    } else {
      res.json({ message: 'Product added to panier successfully' });
    }
  });
});

// Route to select products from panier for a customer
app.get('/panier/:customer_id', (req, res) => {
  const customerId = req.params.customer_id;

  const query = `
    SELECT products.*, panier.quantity
    FROM products
    INNER JOIN panier ON products.id = panier.product_id
    WHERE panier.customer_id = ?
  `;

  connection.query(query, [customerId], (error, results) => {
    if (error) {
      console.log('Error fetching products in panier:', error);
      res.status(500).json({ error: 'Failed to fetch products in panier' });
    } else {
      res.json({ panier: results });
    }
  });
});


// Route to update the quantity of a product in the cart
app.put('/panier/:cartItemId', (req, res) => {
  const cartItemId = req.params.cartItemId;
  const updatedQuantity = req.body.quantity;
  const updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const query = 'UPDATE panier SET quantity = ?, updated_at = ? WHERE id = ?';
  const values = [updatedQuantity, updated_at, cartItemId];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.log('Error updating quantity:', error);
      res.status(500).json({ error: 'Failed to update quantity' });
    } else {
      res.status(200).json({ message: 'Quantity updated successfully' });
    }
  });
});









// Route login

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  connection.query('SELECT * FROM customers WHERE email = ?', email, (err, rows) => {
    if (err) {
      console.log('Error while fetching customer:', err);
      res.status(500).json({ error: 'Server error' });
    } else if (rows.length === 0) {
      res.status(400).json({ error: 'Email not found' });
    } else if (rows[0].password !== password) {
      res.status(400).json({ error: 'Invalid password' });
    } else {
      res.json({ message: 'Login successful', customer_id: rows[0].id });
    }
  });
});

app.get('/customer/:id', (req, res) => {
  const customerId = req.params.id;

  const query = `SELECT * FROM customers WHERE id = ?`;

  connection.query(query, [customerId], (error, results) => {
    if (error) {
      console.log('Error fetching customer:', error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    } else {
      if (results.length > 0) {
        const customer = results[0];
        res.json(customer);
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    }
  });
});


// Define the route for updating the profile information
app.put('/customer/:customerId', (req, res) => {
  const customerId = req.params.customerId;
  const updatedProfile = req.body;

  const query = 'UPDATE customers SET full_name = ?, email = ? WHERE id = ?';
  const values = [updatedProfile.full_name, updatedProfile.email, customerId];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.log('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    } else {
      res.status(200).json({ message: 'Profile updated successfully' });
    }
  });
});


// fetch categories
app.get('/categories', (req, res) => {
  connection.query('SELECT * FROM categories', (err, rows) => {
    if (err) {
      console.log('Error fetching categories:', err);
      res.sendStatus(500);
    } else {
      res.json({ categories: rows });
    }
  });
});

app.get('/products/:categoryName', async (req, res) => {
  const categoryName = req.params.categoryName;

  try {
    const [category] = await connection.query("SELECT id FROM categories WHERE name = ?", [categoryName]);

    if (!category || category.length === 0) {
      console.log('Category not found:', categoryName);
      return res.status(404).json({ message: 'Category not found.' });
    }

    const categoryId = category[0].id;

    const [products] = await connection.query("SELECT * FROM products WHERE category_id = ?", [categoryId]);

    if (!products || products.length === 0) {
      console.log('No products found for category:', categoryName);
      return res.status(404).json({ message: 'No products found for the given category name.' });
    }

    console.log('Products:', products);

    return res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'An error occurred while fetching products.' });
  }
});




// Route to retrieve products under "Produits" category with pagination
app.get('/products/produits/:page', async (req, res) => {
  const page = req.params.page || 1; // Current page
  const perPage = 8; // Products per page
  const offset = (page - 1) * perPage;

  try {
    // Fetch products under the "Produits" category
    const [category] = await db.query("SELECT id FROM categories WHERE name = ?", ['Produits']);

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    const categoryId = category[0].id;

    // Query to retrieve products with pagination
    const [products] = await db.query(
      "SELECT * FROM products WHERE category_id = ? LIMIT ? OFFSET ?",
      [categoryId, perPage, offset]
    );

    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No products found for the given category name.' });
    }

    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred while fetching products.' });
  }
});

// Route to add a new product
app.post('/products', (req, res) => {
  const { name, price, description, image_url, category_id } = req.body;

  // Ensure that all required fields are provided
  if (!name || !price || !description || !image_url || !category_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updated_at = created_at;

  const query = 'INSERT INTO products (name, price, description, image_url, created_at, updated_at, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const values = [name, price, description, image_url, created_at, updated_at, category_id];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.log('Error adding product:', error);
      res.status(500).json({ error: 'Error adding product' });
    } else {
      res.json({ message: 'Product added successfully', productId: results.insertId });
    }
  });
});


// Route to add a new category
app.post('/categories', (req, res) => {
  const { name, description } = req.body;

  // Ensure that all required fields are provided
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const query = 'INSERT INTO categories (name, description) VALUES (?, ?)';
  const values = [name, description];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.log('Error adding category:', error);
      res.status(500).json({ error: 'Error adding category' });
    } else {
      res.json({ message: 'Category added successfully', categoryId: results.insertId });
    }
  });
});





