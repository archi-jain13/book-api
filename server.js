const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ==================== DATABASE ====================
let books = [
    { 
        id: 1, 
        title: "The Alchemist", 
        author: "Paulo Coelho", 
        year: 1988,
        genre: "Fiction",
        isbn: "978-0062315007",
        pages: 208,
        rating: 4.5,
        available: true
    },
    { 
        id: 2, 
        title: "The Hobbit", 
        author: "J.R.R. Tolkien", 
        year: 1937,
        genre: "Fantasy",
        isbn: "978-0547928227",
        pages: 310,
        rating: 4.7,
        available: true
    },
    { 
        id: 3, 
        title: "1984", 
        author: "George Orwell", 
        year: 1949,
        genre: "Dystopian",
        isbn: "978-0451524935",
        pages: 328,
        rating: 4.6,
        available: false
    }
];

// ==================== HELPER FUNCTIONS ====================
const findBookById = (id) => books.find(b => b.id === parseInt(id));
const findBookIndex = (id) => books.findIndex(b => b.id === parseInt(id));
const generateId = () => books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;

// ==================== ROUTES ====================

// 🏠 Home Route - Welcome Message
app.get('/', (req, res) => {
    res.json({
        message: '📚 Welcome to the Book Collection API!',
        version: '2.0',
        endpoints: {
            getAllBooks: 'GET /api/books',
            getBookById: 'GET /api/books/:id',
            searchBooks: 'GET /api/books/search?q=query',
            addBook: 'POST /api/books',
            updateBook: 'PUT /api/books/:id',
            deleteBook: 'DELETE /api/books/:id',
            getStats: 'GET /api/stats'
        },
        documentation: 'http://localhost:3000/api/docs'
    });
});

// 📖 API Documentation
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Book Collection API Documentation',
        description: 'A RESTful API for managing a book collection',
        baseURL: 'http://localhost:3000/api',
        endpoints: [
            {
                method: 'GET',
                path: '/books',
                description: 'Get all books',
                queryParams: {
                    genre: 'Filter by genre',
                    author: 'Filter by author',
                    available: 'Filter by availability (true/false)'
                }
            },
            {
                method: 'GET',
                path: '/books/:id',
                description: 'Get a specific book by ID'
            },
            {
                method: 'GET',
                path: '/books/search?q=query',
                description: 'Search books by title or author'
            },
            {
                method: 'POST',
                path: '/books',
                description: 'Add a new book',
                body: {
                    title: 'string (required)',
                    author: 'string (required)',
                    year: 'number (required)',
                    genre: 'string (optional)',
                    isbn: 'string (optional)',
                    pages: 'number (optional)',
                    rating: 'number (optional)',
                    available: 'boolean (optional)'
                }
            },
            {
                method: 'PUT',
                path: '/books/:id',
                description: 'Update an existing book'
            },
            {
                method: 'DELETE',
                path: '/books/:id',
                description: 'Delete a book'
            }
        ]
    });
});

// 📚 GET - Get all books with filtering
app.get('/api/books', (req, res) => {
    try {
        let filteredBooks = [...books];
        
        // Filter by genre
        if (req.query.genre) {
            filteredBooks = filteredBooks.filter(b => 
                b.genre?.toLowerCase() === req.query.genre.toLowerCase()
            );
        }
        
        // Filter by author
        if (req.query.author) {
            filteredBooks = filteredBooks.filter(b => 
                b.author.toLowerCase().includes(req.query.author.toLowerCase())
            );
        }
        
        // Filter by availability
        if (req.query.available) {
            const isAvailable = req.query.available === 'true';
            filteredBooks = filteredBooks.filter(b => b.available === isAvailable);
        }
        
        res.json({
            success: true,
            count: filteredBooks.length,
            data: filteredBooks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching books',
            error: error.message
        });
    }
});

// 🔍 GET - Search books
app.get('/api/books/search', (req, res) => {
    try {
        const query = req.query.q?.toLowerCase();
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const results = books.filter(book => 
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query) ||
            book.genre?.toLowerCase().includes(query)
        );
        
        res.json({
            success: true,
            query: query,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching books',
            error: error.message
        });
    }
});

// 📖 GET - Get a book by ID
app.get('/api/books/:id', (req, res) => {
    try {
        const book = findBookById(req.params.id);
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: `Book with ID ${req.params.id} not found`
            });
        }
        
        res.json({
            success: true,
            data: book
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching book',
            error: error.message
        });
    }
});

// ➕ POST - Add a new book
app.post('/api/books', (req, res) => {
    try {
        const { title, author, year, genre, isbn, pages, rating, available } = req.body;
        
        // Validation
        if (!title || !author || !year) {
            return res.status(400).json({
                success: false,
                message: 'Title, author, and year are required fields'
            });
        }
        
        // Check for duplicate ISBN
        if (isbn && books.some(b => b.isbn === isbn)) {
            return res.status(409).json({
                success: false,
                message: 'A book with this ISBN already exists'
            });
        }
        
        const newBook = {
            id: generateId(),
            title,
            author,
            year: parseInt(year),
            genre: genre || 'Uncategorized',
            isbn: isbn || null,
            pages: pages ? parseInt(pages) : null,
            rating: rating ? parseFloat(rating) : null,
            available: available !== undefined ? available : true,
            createdAt: new Date().toISOString()
        };
        
        books.push(newBook);
        
        res.status(201).json({
            success: true,
            message: 'Book added successfully',
            data: newBook
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding book',
            error: error.message
        });
    }
});

// ✏️ PUT - Update a book
app.put('/api/books/:id', (req, res) => {
    try {
        const bookIndex = findBookIndex(req.params.id);
        
        if (bookIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Book with ID ${req.params.id} not found`
            });
        }
        
        const { title, author, year, genre, isbn, pages, rating, available } = req.body;
        
        const updatedBook = {
            ...books[bookIndex],
            title: title ?? books[bookIndex].title,
            author: author ?? books[bookIndex].author,
            year: year ? parseInt(year) : books[bookIndex].year,
            genre: genre ?? books[bookIndex].genre,
            isbn: isbn ?? books[bookIndex].isbn,
            pages: pages ? parseInt(pages) : books[bookIndex].pages,
            rating: rating ? parseFloat(rating) : books[bookIndex].rating,
            available: available !== undefined ? available : books[bookIndex].available,
            updatedAt: new Date().toISOString()
        };
        
        books[bookIndex] = updatedBook;
        
        res.json({
            success: true,
            message: 'Book updated successfully',
            data: updatedBook
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating book',
            error: error.message
        });
    }
});

// 🗑️ DELETE - Remove a book
app.delete('/api/books/:id', (req, res) => {
    try {
        const bookIndex = findBookIndex(req.params.id);
        
        if (bookIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Book with ID ${req.params.id} not found`
            });
        }
        
        const deletedBook = books.splice(bookIndex, 1)[0];
        
        res.json({
            success: true,
            message: 'Book deleted successfully',
            data: deletedBook
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting book',
            error: error.message
        });
    }
});

// 📊 GET - Get statistics
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalBooks: books.length,
            availableBooks: books.filter(b => b.available).length,
            unavailableBooks: books.filter(b => !b.available).length,
            genres: [...new Set(books.map(b => b.genre))],
            authors: [...new Set(books.map(b => b.author))],
            averageRating: (books.reduce((sum, b) => sum + (b.rating || 0), 0) / books.length).toFixed(2),
            oldestBook: books.reduce((oldest, book) => 
                book.year < oldest.year ? book : oldest
            ),
            newestBook: books.reduce((newest, book) => 
                book.year > newest.year ? book : newest
            )
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════════╗
    ║                                                ║
    ║   📚 Book Collection API Server Running 📚    ║
    ║                                                ║
    ║   🚀 Server: http://localhost:${PORT}          ║
    ║   📖 Docs:   http://localhost:${PORT}/api/docs ║
    ║                                                ║
    ╚════════════════════════════════════════════════╝
    `);
});

module.exports = app;