# Mongoose CRUD Operations

CRUD stands for Create, Read, Update, and Delete. These are the four basic operations used to manage data within persistent storage databases.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When using Mongoose:
1. **Schema**: Defines the structure of documents (fields, types, default values, validators).
2. **Model**: A wrapper class compiled from a Schema. Models represent MongoDB collections and provide the methods (like `find`, `create`) used to query the database.
3. **Document**: A single instance of a model. Modifying a document instance and calling `.save()` writes changes to the database.

---

## 2. Theory & Deep Dive

### Mongoose Validation & Options
Mongoose validators run automatically when you call `Model.create()` or `document.save()`. 
However, they **do not** run by default when you execute updates using `findByIdAndUpdate()`. To enforce validation checks during updates, you must explicitly enable the `runValidators` option:
```javascript
Model.findByIdAndUpdate(id, updates, { runValidators: true });
```

---

## 3. Code Implementation

### File: `models/note.js`
```javascript
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  description: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);
```

### File: `controllers/noteController.js`
```javascript
const Note = require("../models/note");

// 1. CREATE: Add new note document
async function createNote(req, res) {
  try {
    const { title, description } = req.body;
    const newNote = await Note.create({ title, description });

    res.status(201).json({ success: true, message: "Note Created successfully", note: newNote });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// 2. READ: Fetch all notes
async function getNotes(req, res) {
  try {
    const notes = await Note.find();
    res.status(200).json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 4. Self-Contained Mini-Project: Task Manager Database API

We will build a simple Express task manager that connects to MongoDB to create, read, toggle status, and delete tasks.

### Project Setup
```text
express-mongo-tasks/
├── server.js
└── package.json (requires: express, mongoose)
```

### File: `server.js`
```javascript
const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/task_manager_db")
  .then(() => console.log("Task DB Connected"))
  .catch(err => console.error("DB connection error:", err));

// Schema Definition
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, minlength: 3 },
  completed: { type: Boolean, default: false }
});
const Task = mongoose.model("Task", taskSchema);

// CREATE Route
app.post("/tasks", async (req, res) => {
  try {
    const task = await Task.create({ title: req.body.title });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// READ Route (all tasks)
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE Route (toggle completion status)
app.patch("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    
    // Toggle completed state
    task.completed = !task.completed;
    await task.save();

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE Route
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("Task manager API running on port 3000"));
```

---

## 5. Advanced Production Practices & Security

### Pagination (Skip & Limit)
If a collection has millions of documents, calling `find()` without limits will load all records into RAM, crashing the server.
- **Solution**: Implement Pagination using `limit` and `skip`:
  ```javascript
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skipIndex = (page - 1) * limit;

  const results = await Task.find()
    .limit(limit)
    .skip(skipIndex);
  ```

### Soft Deletes
In production, dropping documents directly using `findByIdAndDelete` is often discouraged since it destroys user data history. Instead, implement soft deletes:
- Add a `deleted: { type: Boolean, default: false }` property to your schema.
- To "delete" a document, update this flag to `true`.
- Filter all read queries to exclude soft-deleted documents (`find({ deleted: false })`).

---

## 6. Key Takeaways
1. Set the option `{ new: true }` in `findByIdAndUpdate` to ensure the function returns the modified document, rather than the original stale document.
2. Set `runValidators: true` during update operations to ensure Mongoose runs schema schema-validation checks (like `minlength` or custom regex patterns) before finalizing the modification.
3. Handle Mongoose ID parsing errors (casting failures) dynamically inside database route handlers.
