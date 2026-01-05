const Employee = require("../../models/admin/Employee");
const User = require("../../models/auth/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const employee = await Employee.findOne({
      email: email.toLowerCase(),
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    if (
      employee.accessLevel !== "Admin" &&
      employee.accessLevel !== "Full Access"
    ) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    if (employee.employmentStatus !== "Active") {
      return res.status(403).json({
        success: false,
        error: "Your account is not active.",
      });
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: employee._id,
        email: employee.email,
        userName: employee.userName,
        accessLevel: employee.accessLevel,
        role: "admin",
      },
      process.env.JWT_SECRET || "your-secret-key-here",
      { expiresIn: "7d" }
    );

    const employeeData = employee.toObject();
    delete employeeData.password;

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user: employeeData,
    });
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

// Add new employee - WITH PASSWORD HASHING
exports.addEmployee = async (req, res) => {
  try {
    const {
      userName,
      fullName,
      email,
      phoneNumber,
      password,
      position,
      department,
      monthlySalary,
      hireDate,
      address,
      emergencyContact,
      accessLevel,
      employmentStatus,
      role,
      imageName,
    } = req.body;

    // Validation
    if (
      !userName ||
      !fullName ||
      !email ||
      !phoneNumber ||
      !password ||
      !monthlySalary ||
      !hireDate
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields",
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ email: email.toLowerCase() }, { userName: userName }],
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: "Employee with this email or username already exists",
      });
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new employee
    const newEmployee = new Employee({
      userName,
      fullName,
      email: email.toLowerCase(),
      phoneNumber,
      password: hashedPassword, // Save hashed password
      position: position || "Trainer",
      department: department || "Fitness",
      monthlySalary: Number(monthlySalary),
      hireDate,
      address: address || "",
      emergencyContact: emergencyContact || "",
      accessLevel: accessLevel || "Basic (Front Desk)",
      employmentStatus: employmentStatus || "Active",
      role: role || "employee",
      imageName: imageName || "",
    });

    await newEmployee.save();

    // If role is trainer, also create entry in Users collection for authentication
    if (role === "trainer") {
      try {
        // Clean phone number to only digits and ensure it's 10-15 digits
        let cleanPhoneNumber = phoneNumber.replace(/\D/g, "");

        // Validate phone number length
        if (cleanPhoneNumber.length < 10 || cleanPhoneNumber.length > 15) {
          throw new Error(
            `Invalid phone number length: ${cleanPhoneNumber.length} digits. Must be 10-15 digits.`
          );
        }

        console.log("📞 Creating User with phone:", cleanPhoneNumber);

        // Check if user already exists in Users collection
        const existingUser = await User.findOne({
          $or: [
            { email: email.toLowerCase() },
            { userName: userName },
            { phoneNumber: cleanPhoneNumber },
          ],
        });

        if (existingUser) {
          console.log("⚠️  User already exists in Users collection:", userName);
        } else {
          // Get admin email from session
          const adminEmail =
            req.session?.user?.email ||
            req.body.adminEmail ||
            "admin@flamebox.com";

          const newUser = new User({
            userName,
            fullName,
            email: email.toLowerCase(),
            phoneNumber: cleanPhoneNumber,
            password: password, // Use plain password - User model will hash it via pre-save hook
            role: "trainer",
            adminEmail: adminEmail,
            isActive: employmentStatus === "Active",
            isVerified: true, // Auto-verify trainers added by admin
          });

          await newUser.save();
          console.log(
            "✅ Trainer account created in Users collection:",
            userName,
            "Phone:",
            cleanPhoneNumber
          );
        }
      } catch (userError) {
        console.error(
          "❌ Failed to create User entry for trainer:",
          userError.message
        );

        // Return the specific error to help debug
        if (userError.name === "ValidationError") {
          const validationErrors = Object.keys(userError.errors).map(
            (key) => `${key}: ${userError.errors[key].message}`
          );
          console.error("Validation errors:", validationErrors);
        }

        // Delete the employee since auth account creation failed
        await Employee.findByIdAndDelete(newEmployee._id);

        return res.status(400).json({
          success: false,
          error: `Trainer employee created but authentication account failed: ${userError.message}`,
          details:
            userError.name === "ValidationError"
              ? Object.keys(userError.errors)
                  .map((key) => userError.errors[key].message)
                  .join(", ")
              : userError.message,
        });
      }
    }

    // Remove password from response
    const employeeData = newEmployee.toObject();
    delete employeeData.password;

    res.status(201).json({
      success: true,
      message:
        role === "trainer"
          ? "Trainer added successfully"
          : "Employee added successfully",
      employee: employeeData,
    });
  } catch (err) {
    console.error("Add Employee Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while adding employee",
    });
  }
};

// Edit employee by ID - WITH PASSWORD HASHING
exports.editEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If password is being updated, hash it; otherwise remove it from updateData
    if (updateData.password && updateData.password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    } else {
      // Don't update password if it's empty or not provided
      delete updateData.password;
    }

    // Convert monthlySalary to number if provided
    if (updateData.monthlySalary) {
      updateData.monthlySalary = Number(updateData.monthlySalary);
    }

    // Update email to lowercase if provided
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    const employee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // If this is a trainer, also update in Users collection
    if (employee.role === "trainer") {
      try {
        const user = await User.findOne({ userName: employee.userName });

        if (user) {
          // Update fields directly on the document
          if (updateData.fullName) user.fullName = updateData.fullName;
          if (updateData.email) user.email = updateData.email.toLowerCase();
          if (updateData.phoneNumber) user.phoneNumber = updateData.phoneNumber;
          // For password, set the hashed password directly (since it's already hashed in Employee update)
          if (updateData.password) {
            // Mark password as not modified so pre-save hook doesn't hash it again
            user.password = updateData.password;
            user.markModified("password");
          }
          if (updateData.employmentStatus) {
            user.isActive = updateData.employmentStatus === "Active";
          }

          // Save without triggering password hash (if password was updated)
          if (updateData.password) {
            // Use update to bypass pre-save hook for password
            await User.updateOne(
              { userName: employee.userName },
              {
                $set: {
                  fullName: user.fullName,
                  email: user.email,
                  phoneNumber: user.phoneNumber,
                  password: updateData.password,
                  isActive: user.isActive,
                },
              },
              { runValidators: true }
            );
          } else {
            // No password update, safe to use save()
            await user.save();
          }

          console.log(
            "✅ Trainer account updated in Users collection:",
            employee.userName
          );
        }
      } catch (userError) {
        console.error(
          "Warning: Failed to update User entry for trainer:",
          userError
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });
  } catch (err) {
    console.error("Edit Employee Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while updating employee",
    });
  }
};

// Delete employee by ID
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // If this is a trainer, also delete from Users collection
    if (employee.role === "trainer") {
      try {
        await User.findOneAndDelete({ userName: employee.userName });
        console.log(
          "✅ Trainer account deleted from Users collection:",
          employee.userName
        );
      } catch (userError) {
        console.error(
          "Warning: Failed to delete User entry for trainer:",
          userError
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (err) {
    console.error("Delete Employee Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while deleting employee",
    });
  }
};

// Fetch all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      employees,
      count: employees.length,
    });
  } catch (err) {
    console.error("Get All Employees Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching employees",
    });
  }
};

// Fetch employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (err) {
    console.error("Get Employee By ID Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching employee",
    });
  }
};

// Verify Token
exports.verifyToken = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      user: employee,
    });
  } catch (err) {
    console.error("Verify Token Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during token verification",
    });
  }
};

// Admin Logout
exports.adminLogout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during logout",
    });
  }
};
