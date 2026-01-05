const express = require("express");
const router = express.Router();
const employeeController = require("../../controllers/admin/employee-controller"); 

// Admin Login (POST)
router.post("/login", employeeController.adminLogin);

// Verify Token (GET)
router.get("/verify", employeeController.verifyToken);

// Logout (POST)
router.post("/logout", employeeController.adminLogout);

// Add new employee (POST)
router.post("/postemployees", employeeController.addEmployee);

// Get all employees (GET)
router.get("/getemployees", employeeController.getAllEmployees);

// Get employee by ID (GET)
router.get("/getemployee/:id", employeeController.getEmployeeById);

// Edit employee by ID (PUT)
router.put("/editemployees/:id", employeeController.editEmployee);

// Delete employee by ID (DELETE)
router.delete("/deleteemployees/:id", employeeController.deleteEmployee);

module.exports = router;
