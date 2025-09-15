// Authentication JavaScript Functionality

// Mobile Navigation Toggle (reused from main script)
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Password Toggle Functionality
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Form Validation Functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^(\+961|0)?[0-9]{7,8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

function validatePassword(password) {
    return password.length >= 8;
}

function validateAge(age) {
    const ageNum = parseInt(age);
    return ageNum >= 18 && ageNum <= 65;
}

function validateDateOfBirth(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age >= 18 && age <= 65;
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    const formGroup = field.closest('.form-group');
    
    formGroup.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    const formGroup = field.closest('.form-group');
    
    formGroup.classList.remove('error');
    errorElement.classList.remove('show');
}

function validateField(fieldId, value, validator, errorMessage) {
    if (!value.trim()) {
        showError(fieldId, 'This field is required');
        return false;
    }
    
    if (validator && !validator(value)) {
        showError(fieldId, errorMessage);
        return false;
    }
    
    clearError(fieldId);
    return true;
}

// File Upload Handling
function handleFileUpload(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.querySelector(`label[for="${inputId}"]`);
    
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const fileUpload = input.closest('.file-upload');
            const fileText = label.querySelector('.file-text');
            
            fileUpload.classList.add('has-file');
            fileText.textContent = file.name;
            
            // Validate file type and size
            const maxSize = 5 * 1024 * 1024; // 5MB
            const allowedTypes = {
                'cv': ['.pdf'],
                'identityDocument': ['.pdf', '.jpg', '.jpeg', '.png']
            };
            
            if (file.size > maxSize) {
                showError(inputId, 'File size must be less than 5MB');
                return;
            }
            
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedTypes[inputId].includes(fileExtension)) {
                showError(inputId, `File type not allowed. Allowed types: ${allowedTypes[inputId].join(', ')}`);
                return;
            }
            
            clearError(inputId);
        }
    });
}

// Login Form Handling
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        let isValid = true;
        
        // Validate email
        if (!validateField('email', email, validateEmail, 'Please enter a valid email address')) {
            isValid = false;
        }
        
        // Validate password
        if (!validateField('password', password, validatePassword, 'Password must be at least 8 characters long')) {
            isValid = false;
        }
        
        if (isValid) {
            // Show loading state
            const submitBtn = loginForm.querySelector('.btn-auth');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                // Here you would make an actual API call
                console.log('Login attempt:', { email, password, rememberMe });
                
                // For demo purposes, show success
                showSuccessMessage('Login successful! Redirecting...');
                
                // Redirect to dashboard after successful login
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
                
                // Reset button state
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }, 2000);
        }
    });
}

// Signup Form Handling
if (document.getElementById('signupForm')) {
    const signupForm = document.getElementById('signupForm');
    
    // Initialize file upload handlers
    handleFileUpload('cv', 'cv');
    handleFileUpload('identityDocument', 'identityDocument');
    
    // Real-time validation
    const fieldsToValidate = [
        { id: 'fullName', validator: null, errorMessage: 'Please enter your full name' },
        { id: 'age', validator: validateAge, errorMessage: 'Age must be between 18 and 65' },
        { id: 'dateOfBirth', validator: validateDateOfBirth, errorMessage: 'You must be between 18 and 65 years old' },
        { id: 'area', validator: null, errorMessage: 'Please select your area' },
        { id: 'hoursPerWeek', validator: null, errorMessage: 'Please select your availability' },
        { id: 'email', validator: validateEmail, errorMessage: 'Please enter a valid email address' },
        { id: 'phone', validator: validatePhone, errorMessage: 'Please enter a valid Lebanese phone number' },
        { id: 'password', validator: validatePassword, errorMessage: 'Password must be at least 8 characters long' },
        { id: 'confirmPassword', validator: null, errorMessage: 'Passwords do not match' }
    ];
    
    fieldsToValidate.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('blur', function() {
                validateField(field.id, this.value, field.validator, field.errorMessage);
            });
            
            element.addEventListener('input', function() {
                if (this.value.trim()) {
                    clearError(field.id);
                }
            });
        }
    });
    
    // Special handling for password confirmation
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword) {
        confirmPassword.addEventListener('blur', function() {
            const password = document.getElementById('password').value;
            const confirmPass = this.value;
            
            if (confirmPass && password !== confirmPass) {
                showError('confirmPassword', 'Passwords do not match');
            } else if (confirmPass) {
                clearError('confirmPassword');
            }
        });
    }
    
    // Special handling for sitter type checkboxes
    const sitterTypeCheckboxes = document.querySelectorAll('input[name="sitterType"]');
    sitterTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedBoxes = document.querySelectorAll('input[name="sitterType"]:checked');
            if (checkedBoxes.length === 0) {
                showError('sitterType', 'Please select at least one service type');
            } else {
                clearError('sitterType');
            }
        });
    });
    
    // Terms and conditions validation
    const termsCheckbox = document.getElementById('termsAccepted');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                showError('termsAccepted', 'You must accept the terms and conditions');
            } else {
                clearError('termsAccepted');
            }
        });
    }
    
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let isValid = true;
        
        // Validate all fields
        fieldsToValidate.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                if (!validateField(field.id, element.value, field.validator, field.errorMessage)) {
                    isValid = false;
                }
            }
        });
        
        // Validate sitter type
        const checkedSitterTypes = document.querySelectorAll('input[name="sitterType"]:checked');
        if (checkedSitterTypes.length === 0) {
            showError('sitterType', 'Please select at least one service type');
            isValid = false;
        }
        
        // Validate terms acceptance
        if (!termsCheckbox.checked) {
            showError('termsAccepted', 'You must accept the terms and conditions');
            isValid = false;
        }
        
        // Validate file uploads
        const cvFile = document.getElementById('cv').files[0];
        const identityFile = document.getElementById('identityDocument').files[0];
        
        if (!cvFile) {
            showError('cv', 'Please upload your CV');
            isValid = false;
        }
        
        if (!identityFile) {
            showError('identityDocument', 'Please upload your identity document');
            isValid = false;
        }
        
        if (isValid) {
            // Show loading state
            const submitBtn = signupForm.querySelector('.btn-auth');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            
            // Collect form data
            const formData = new FormData(signupForm);
            const sitterTypes = Array.from(checkedSitterTypes).map(cb => cb.value);
            formData.set('sitterTypes', JSON.stringify(sitterTypes));
            
            // Simulate API call
            setTimeout(() => {
                console.log('Signup data:', Object.fromEntries(formData));
                
                // For demo purposes, show success
                showSuccessMessage('Account created successfully! Please check your email for verification.');
                
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                
                // Reset button state
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }, 3000);
        }
    });
}

// Success Message Display
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div class="success-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add success message styles
    const style = document.createElement('style');
    style.textContent = `
        .success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(39, 174, 96, 0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        }
        
        .success-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .success-content i {
            font-size: 1.2rem;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(successDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        successDiv.remove();
        style.remove();
    }, 5000);
}

// Social Login Handlers
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        
        const provider = this.classList.contains('google-btn') ? 'Google' : 'Facebook';
        
        // Show loading state
        this.style.opacity = '0.7';
        this.style.cursor = 'not-allowed';
        
        // Simulate social login
        setTimeout(() => {
            console.log(`${provider} login initiated`);
            showSuccessMessage(`${provider} login successful!`);
            
            // Reset button state
            this.style.opacity = '1';
            this.style.cursor = 'pointer';
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }, 1500);
    });
});

// Form Animation on Load
document.addEventListener('DOMContentLoaded', function() {
    const authCard = document.querySelector('.auth-card');
    if (authCard) {
        authCard.style.opacity = '0';
        authCard.style.transform = 'translateY(30px)';
        authCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            authCard.style.opacity = '1';
            authCard.style.transform = 'translateY(0)';
        }, 200);
    }
    
    // Animate form sections
    const formSections = document.querySelectorAll('.form-section');
    formSections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
        
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 400 + (index * 100));
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Header background change on scroll
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (header) {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
    }
});

// Phone number formatting for Lebanon
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.startsWith('961')) {
            value = '+' + value;
        } else if (value.startsWith('0')) {
            value = '+961' + value.substring(1);
        } else if (value.length > 0 && !value.startsWith('+')) {
            value = '+961' + value;
        }
        
        e.target.value = value;
    });
}

// Age and Date of Birth synchronization
const ageInput = document.getElementById('age');
const dobInput = document.getElementById('dateOfBirth');

if (ageInput && dobInput) {
    ageInput.addEventListener('input', function() {
        const age = parseInt(this.value);
        if (age >= 18 && age <= 65) {
            const today = new Date();
            const birthYear = today.getFullYear() - age;
            const birthDate = new Date(birthYear, today.getMonth(), today.getDate());
            dobInput.value = birthDate.toISOString().split('T')[0];
        }
    });
    
    dobInput.addEventListener('change', function() {
        const today = new Date();
        const birthDate = new Date(this.value);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        let calculatedAge = age;
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }
        
        if (calculatedAge >= 18 && calculatedAge <= 65) {
            ageInput.value = calculatedAge;
        }
    });
}
