const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer'); 
const path = require('path');
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


app.get('/products/:categoryName', async (req, res) => {
  const categoryName = req.params.categoryName;
  const page = req.query.page || 1; // Get the page from query parameters
  const itemsPerPage = 10; // Number of items per page

  try {
    const [categoryRows] = await connection.query("SELECT id FROM categories WHERE name = ?", [categoryName]);

    if (!categoryRows || categoryRows.length === 0) {
      console.log('Category not found:', categoryName);
      return res.status(404).json({ message: 'Category not found.' });
    }

    const categoryId = categoryRows[0].id;
    
    // Calculate the offset based on the page and items per page
    const offset = (page - 1) * itemsPerPage;

    const [productsRows] = await connection.query(
      "SELECT * FROM products WHERE category_id = ? LIMIT ? OFFSET ?",
      [categoryId, itemsPerPage, offset]
    );

    if (!productsRows || productsRows.length === 0) {
      console.log('No products found for category:', categoryName);
      return res.status(404).json({ message: 'No products found for the given category name.' });
    }

    console.log('Products:', productsRows);

    return res.status(200).json({ products: productsRows });
  } catch (error) {
    console.error('An error occurred:', error);
    return res.status(500).json({ message: 'An error occurred while fetching products.' });
  }
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

// Route to delete a category by ID
app.delete('/categories/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;

  // Check if the category exists before attempting to delete it
  connection.query('SELECT * FROM categories WHERE id = ?', [categoryId], (err, rows) => {
    if (err) {
      console.log('Error fetching category:', err);
      res.status(500).json({ error: 'Server error' });
    } else if (rows.length === 0) {
      res.status(404).json({ error: 'Category not found' });
    } else {
      // Category found, proceed with deletion
      connection.query('DELETE FROM categories WHERE id = ?', [categoryId], (error, results) => {
        if (error) {
          console.log('Error deleting category:', error);
          res.status(500).json({ error: 'Error deleting category' });
        } else {
          res.json({ message: 'Category deleted successfully' });
        }
      });
    }
  });
});

// Route to delete a product by ID
app.delete('/products/:productId', (req, res) => {
  const productId = req.params.productId;

  // Check if the product exists before attempting to delete it
  connection.query('SELECT * FROM products WHERE id = ?', [productId], (err, rows) => {
    if (err) {
      console.log('Error fetching product:', err);
      res.status(500).json({ error: 'Server error' });
    } else if (rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      // Product found, proceed with deletion
      connection.query('DELETE FROM products WHERE id = ?', [productId], (error, results) => {
        if (error) {
          console.log('Error deleting product:', error);
          res.status(500).json({ error: 'Error deleting product' });
        } else {
          res.json({ message: 'Product deleted successfully' });
        }
      });
    }
  });
});


// Route to update a product by ID
app.put('/products/:productId', (req, res) => {
  const productId = req.params.productId;
  const { name, price, description, image_url, category_id } = req.body;

  // Prepare the updated product data
  const updatedProduct = {};

  if (name) {
    updatedProduct.name = name;
  }
  if (price) {
    updatedProduct.price = price;
  }
  if (description) {
    updatedProduct.description = description;
  }
  if (image_url) {
    updatedProduct.image_url = image_url;
  }
  if (category_id) {
    updatedProduct.category_id = category_id;
  }

  if (Object.keys(updatedProduct).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updatedProduct.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const query = `
    UPDATE products
    SET ?
    WHERE id = ?
  `;

  connection.query(query, [updatedProduct, productId], (error, results) => {
    if (error) {
      console.log('Error updating product:', error);
      res.status(500).json({ error: 'Error updating product' });
    } else {
      res.json({ message: 'Product updated successfully' });
    }
  });
});

// Route to update the "disponibilite" column for a specific product by ID
app.put('/products/:productId/disponibilite', (req, res) => {
  const productId = req.params.productId;
  const { isToggled } = req.body;

  // Ensure that the "isToggled" field is provided
  if (isToggled === undefined) {
    return res.status(400).json({ error: 'The "isToggled" field is required' });
  }

  // Determine the value to set for "disponibilite" based on "isToggled"
  const disponibiliteValue = isToggled ? 'Disponible' : 'non_disponible';

  const query = `
    UPDATE products
    SET disponibilite = ?
    WHERE id = ?
  `;

  connection.query(query, [disponibiliteValue, productId], (error, results) => {
    if (error) {
      console.log('Error updating disponibilite:', error);
      res.status(500).json({ error: 'Error updating disponibilite' });
    } else {
      res.json({ message: 'Disponibilite updated successfully' });
    }
  });
});


// Route to fetch the disponibilite status of a specific product by its ID
app.get('/products/disponibilite/:productId', async (req, res) => {
  const productId = req.params.productId; // The ID of the specific product

  try {
    // Fetch the product's disponibilite status by its ID
    connection.query(
      "SELECT disponibilite FROM products WHERE id = ?",
      [productId],
      (error, results) => {
        if (error) {
          console.error('Database Error:', error); // Log the error for debugging
          return res.status(500).json({ message: 'An error occurred while fetching the product disponibilite.', error: error.message });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: 'Product not found with the specified ID.' });
        }

        const disponibilite = results[0].disponibilite;

        return res.status(200).json({ disponibilite });
      }
    );
  } catch (error) {
    console.error('An error occurred:', error);
    return res.status(500).json({ message: 'An error occurred while fetching the product disponibilite.' });
  }
});







// Define a storage location for uploaded files using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'C:/Users/admin/Desktop/project/frontend/asset/'); // Set the destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Generate a unique filename for each uploaded file
  },
});

const upload = multer({ storage: storage });

// Route to handle image uploads
app.post('/upload_image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Access the uploaded file's path
  const imagePath = req.file.path;

  // You can save the imagePath to your database or perform any other necessary operations here

  res.json({ imageUrl: imagePath }); // Respond with the path to the uploaded image
});

// add fourniceur 

app.post('/fournisseurs', (req, res) => {
  const { nom, tel, email, solde, avance, reste } = req.body;

  // Ensure that all required fields are provided
  if (!nom || !tel || !email || solde === undefined || avance === undefined || reste === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updated_at = created_at;

  const query = 'INSERT INTO fournisseur (nom, tel, email, solde, avance, reste, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [nom, tel, email, solde, avance, reste, created_at, updated_at];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.log('Error adding fournisseur:', error);
      res.status(500).json({ error: 'Error adding fournisseur' });
    } else {
      res.json({ message: 'Fournisseur added successfully', fournisseurId: results.insertId });
    }
  });
});


// Delete Fourniceur

app.delete('/fournisseurs/:fournisseurId', (req, res) => {
  const fournisseurId = req.params.fournisseurId;

  // Check if the fournisseur exists before attempting to delete it
  connection.query('SELECT * FROM fournisseur WHERE id = ?', [fournisseurId], (err, rows) => {
    if (err) {
      console.log('Error fetching fournisseur:', err);
      res.status(500).json({ error: 'Server error' });
    } else if (rows.length === 0) {
      res.status(404).json({ error: 'Fournisseur not found' });
    } else {
      // Fournisseur found, proceed with deletion
      connection.query('DELETE FROM fournisseur WHERE id = ?', [fournisseurId], (error, results) => {
        if (error) {
          console.log('Error deleting fournisseur:', error);
          res.status(500).json({ error: 'Error deleting fournisseur' });
        } else {
          res.json({ message: 'Fournisseur deleted successfully' });
        }
      });
    }
  });
});


// Update forniceur 

app.put('/fournisseurs/:fournisseurId', (req, res) => {
  const fournisseurId = req.params.fournisseurId;
  const { nom, tel, email, solde, avance, reste } = req.body;

  // Fetch the current fournisseur data from the database before the update
  connection.query('SELECT * FROM fournisseur WHERE id = ?', [fournisseurId], (err, rows) => {
    if (err) {
      console.log('Error fetching fournisseur:', err);
      return res.status(500).json({ error: 'Server error' });
    } else if (rows.length === 0) {
      return res.status(404).json({ error: 'Fournisseur not found' });
    }

    const oldFournisseurData = rows[0]; // Extract the current fournisseur data

    // Prepare the updated fournisseur data
    const updatedFournisseur = {};

    if (nom) {
      updatedFournisseur.nom = nom;
    }
    if (tel) {
      updatedFournisseur.tel = tel;
    }
    if (email) {
      updatedFournisseur.email = email;
    }
    if (solde !== undefined) {
      updatedFournisseur.solde = solde;
    }
    if (avance !== undefined) {
      updatedFournisseur.avance = avance;
    }
    if (reste !== undefined) {
      updatedFournisseur.reste = reste;
    }

    if (Object.keys(updatedFournisseur).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updatedFournisseur.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const query = `
      UPDATE fournisseur
      SET ?
      WHERE id = ?
    `;

    connection.query(query, [updatedFournisseur, fournisseurId], (error, results) => {
      if (error) {
        console.log('Error updating fournisseur:', error);
        res.status(500).json({ error: 'Error updating fournisseur' });
      } else {
        // Insert the old and new fournisseur data into fournisseurs_history
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const historyQuery = `
          INSERT INTO fournisseurs_history (fournisseur_id, field_name, old_value, new_value, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `;

        // Define the fields you want to track in history (solde, avance, reste)
        const fieldsToTrack = ['solde', 'avance', 'reste'];

        // Iterate over the fields and insert history records for each changed field
        fieldsToTrack.forEach((field) => {
          const oldValue = oldFournisseurData[field];
          const newValue = updatedFournisseur[field];

          // Insert history record if the value has changed
          if (oldValue !== newValue) {
            connection.query(historyQuery, [fournisseurId, field, oldValue, newValue, timestamp], (historyError) => {
              if (historyError) {
                console.log('Error inserting history record:', historyError);
              }
            });
          }
        });

        res.json({ message: 'Fournisseur updated successfully' });
      }
    });
  });
});


// Route to get all suppliers
app.get('/fournisseurs', (req, res) => {
  connection.query('SELECT * FROM fournisseur', (err, rows) => {
    if (err) {
      console.log('Error fetching suppliers:', err);
      res.sendStatus(500);
    } else {
      res.json({ suppliers: rows });
    }
  });
});



app.get('/fournisseurs/:fournisseurId/details', (req, res) => {
  const fournisseurId = req.params.fournisseurId;

  // Fetch fournisseur details from the fournisseur table
  connection.query('SELECT nom, created_at AS "créé le", updated_at AS "modifié le" FROM fournisseur WHERE id = ?', [fournisseurId], (fournisseurError, fournisseurResults) => {
    if (fournisseurError) {
      console.log('Error fetching fournisseur details:', fournisseurError);
      return res.status(500).json({ error: 'Error fetching fournisseur details' });
    }

    // Fetch fournisseur history from the fournisseurs_history table
    connection.query('SELECT field_name, old_value, new_value, timestamp FROM fournisseurs_history WHERE fournisseur_id = ?', [fournisseurId], (historyError, historyResults) => {
      if (historyError) {
        console.log('Error fetching fournisseur history:', historyError);
        return res.status(500).json({ error: 'Error fetching fournisseur history' });
      }

      // Combine the fournisseur details and history into a single response
      const fournisseurDetails = fournisseurResults[0] || {};
      const historyDetails = historyResults;

      res.json({ fournisseurDetails, historyDetails });
    });
  });
});


// Route to get all fournisseur names and IDs
app.get('/fournisseurs/names', (req, res) => {
  connection.query('SELECT id, nom FROM fournisseur', (err, rows) => {
    if (err) {
      console.log('Error fetching fournisseur names and IDs:', err);
      res.status(500).json({ error: 'Error fetching fournisseur names and IDs' });
    } else {
      const fournisseurs = rows.map((row) => ({
        id: row.id,
        nom: row.nom,
      }));
      res.json({ fournisseurs }); 
    }
  });
});


// Route to add a new bill
app.post('/bills', (req, res) => {
  const { serverName, tableNumber, products, totalAmount } = req.body;
  const dateTime = new Date(); // Get the current date and time
  const paymentStatus = 'unpaid'; // Default payment status
  const query = 'INSERT INTO bills (serverName, dateTime, tableNumber, products, totalAmount, payment_status) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(query, [serverName, dateTime, tableNumber, products, totalAmount, paymentStatus], (error, results) => {
    if (error) {
      console.log('Error creating bill:', error);
      res.status(500).json({ error: 'Error creating bill' });
    } else {
      res.json({ message: 'Bill created successfully' });
    }
  });
});



// Route to retrieve bills based on date
app.get('/bills/:date', (req, res) => {
  const { date } = req.params;
  const query = 'SELECT * FROM bills WHERE DATE(dateTime) = ?';
  connection.query(query, [date], (error, rows) => {
    if (error) {
      console.log('Error retrieving bills:', error);
      res.status(500).json({ error: 'Error retrieving bills' });
    } else {
      res.json({ bills: rows });
    }
  });
});

// Route to update the status of a bill
app.put('/bills/:id', (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  const query = 'UPDATE bills SET paymentStatus = ? WHERE id = ?';
  connection.query(query, [paymentStatus, id], (error, results) => {
    if (error) {
      console.log('Error updating bill status:', error);
      res.status(500).json({ error: 'Error updating bill status' });
    } else {
      res.json({ message: 'Bill status updated successfully' });
    }
  });
});

// Route to delete a bill by ID
app.delete('/bills/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM bills WHERE id = ?';
  connection.query(query, [id], (error, results) => {
    if (error) {
      console.log('Error deleting bill:', error);
      res.status(500).json({ error: 'Error deleting bill' });
    } else {
      res.json({ message: 'Bill deleted successfully' });
    }
  });
});
