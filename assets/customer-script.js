// Customer Signup JavaScript Functionality

let childCounter = 0;
let petCounter = 0;

// Initialize customer signup functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeCustomerSignup();
});

function initializeCustomerSignup() {
    // Add event listeners for add buttons
    const addChildBtn = document.getElementById('addChildBtn');
    const addPetBtn = document.getElementById('addPetBtn');
    
    if (addChildBtn) {
        addChildBtn.addEventListener('click', addChildSection);
    }
    
    if (addPetBtn) {
        addPetBtn.addEventListener('click', addPetSection);
    }
    
    // Initialize form validation
    initializeCustomerValidation();
    
    // Initialize phone formatting
    initializePhoneFormatting();
}

// Add Child Section
function addChildSection() {
    childCounter++;
    const container = document.getElementById('childrenContainer');
    
    const childHTML = `
        <div class="dynamic-section-card child-card" id="child-${childCounter}">
            <div class="section-card-header">
                <div class="section-card-title">
                    <i class="fas fa-child"></i>
                    <span>Child ${childCounter}</span>
                </div>
                <button type="button" class="remove-section-btn" onclick="removeChildSection(${childCounter})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="dynamic-form-grid">
                <div class="form-group">
                    <label for="childName_${childCounter}">Child's Name *</label>
                    <div class="input-group">
                        <i class="fas fa-user"></i>
                        <input type="text" id="childName_${childCounter}" name="childName_${childCounter}" required>
                    </div>
                    <span class="error-message" id="childName_${childCounter}Error"></span>
                </div>
                
                <div class="form-group">
                    <label for="childAge_${childCounter}">Age *</label>
                    <div class="input-group">
                        <i class="fas fa-calendar-alt"></i>
                        <input type="number" id="childAge_${childCounter}" name="childAge_${childCounter}" min="0" max="18" required>
                    </div>
                    <span class="error-message" id="childAge_${childCounter}Error"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="childHobbies_${childCounter}">Hobbies & Interests</label>
                <div class="input-group">
                    <i class="fas fa-heart"></i>
                    <textarea id="childHobbies_${childCounter}" name="childHobbies_${childCounter}" rows="3" placeholder="e.g., Drawing, Soccer, Reading, Music..."></textarea>
                </div>
                <span class="error-message" id="childHobbies_${childCounter}Error"></span>
            </div>
            
            <div class="form-group">
                <label>School Schedule *</label>
                <div class="checkbox-group">
                    <label class="checkbox-container">
                        <input type="radio" name="schoolType_${childCounter}" value="regular" required>
                        <span class="checkmark"></span>
                        <div class="checkbox-content">
                            <i class="fas fa-school"></i>
                            <span>Regular School</span>
                        </div>
                    </label>
                    <label class="checkbox-container">
                        <input type="radio" name="schoolType_${childCounter}" value="homeschooled" required>
                        <span class="checkmark"></span>
                        <div class="checkbox-content">
                            <i class="fas fa-home"></i>
                            <span>Homeschooled</span>
                        </div>
                    </label>
                </div>
                <span class="error-message" id="schoolType_${childCounter}Error"></span>
            </div>
            
            <div class="school-hours-section" id="schoolHours_${childCounter}" style="display: none;">
                <div class="school-hours-title">
                    <i class="fas fa-clock"></i>
                    <span>School Hours</span>
                </div>
                <div class="school-hours-grid">
                    <div class="school-day">
                        <div class="school-day-label">Monday</div>
                        <div class="school-time-inputs">
                            <input type="time" name="mondayStart_${childCounter}">
                            <span>to</span>
                            <input type="time" name="mondayEnd_${childCounter}">
                        </div>
                    </div>
                    <div class="school-day">
                        <div class="school-day-label">Tuesday</div>
                        <div class="school-time-inputs">
                            <input type="time" name="tuesdayStart_${childCounter}">
                            <span>to</span>
                            <input type="time" name="tuesdayEnd_${childCounter}">
                        </div>
                    </div>
                    <div class="school-day">
                        <div class="school-day-label">Wednesday</div>
                        <div class="school-time-inputs">
                            <input type="time" name="wednesdayStart_${childCounter}">
                            <span>to</span>
                            <input type="time" name="wednesdayEnd_${childCounter}">
                        </div>
                    </div>
                    <div class="school-day">
                        <div class="school-day-label">Thursday</div>
                        <div class="school-time-inputs">
                            <input type="time" name="thursdayStart_${childCounter}">
                            <span>to</span>
                            <input type="time" name="thursdayEnd_${childCounter}">
                        </div>
                    </div>
                    <div class="school-day">
                        <div class="school-day-label">Friday</div>
                        <div class="school-time-inputs">
                            <input type="time" name="fridayStart_${childCounter}">
                            <span>to</span>
                            <input type="time" name="fridayEnd_${childCounter}">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="homeschooled-section" id="homeschooledInfo_${childCounter}" style="display: none;">
                <div class="homeschooled-title">
                    <i class="fas fa-home"></i>
                    <span>Homeschooling Information</span>
                </div>
                <div class="form-group">
                    <label for="homeschoolSchedule_${childCounter}">Typical Learning Schedule</label>
                    <div class="input-group">
                        <i class="fas fa-clock"></i>
                        <textarea id="homeschoolSchedule_${childCounter}" name="homeschoolSchedule_${childCounter}" rows="2" placeholder="e.g., 9 AM - 12 PM daily, flexible schedule..."></textarea>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="childSpecialNeeds_${childCounter}">Special Needs or Requirements</label>
                <div class="input-group">
                    <i class="fas fa-info-circle"></i>
                    <textarea id="childSpecialNeeds_${childCounter}" name="childSpecialNeeds_${childCounter}" rows="2" placeholder="Any allergies, medical conditions, or special care requirements..."></textarea>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', childHTML);
    
    // Add event listeners for school type changes
    const schoolTypeRadios = document.querySelectorAll(`input[name="schoolType_${childCounter}"]`);
    schoolTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            toggleSchoolSections(childCounter, this.value);
        });
    });
    
    // Scroll to the new section
    document.getElementById(`child-${childCounter}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Add Pet Section
function addPetSection() {
    petCounter++;
    const container = document.getElementById('petsContainer');
    
    const petHTML = `
        <div class="dynamic-section-card pet-card" id="pet-${petCounter}">
            <div class="section-card-header">
                <div class="section-card-title">
                    <i class="fas fa-paw"></i>
                    <span>Pet ${petCounter}</span>
                </div>
                <button type="button" class="remove-section-btn" onclick="removePetSection(${petCounter})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="dynamic-form-grid">
                <div class="form-group">
                    <label for="petName_${petCounter}">Pet's Name *</label>
                    <div class="input-group">
                        <i class="fas fa-tag"></i>
                        <input type="text" id="petName_${petCounter}" name="petName_${petCounter}" required>
                    </div>
                    <span class="error-message" id="petName_${petCounter}Error"></span>
                </div>
                
                <div class="form-group">
                    <label for="petAge_${petCounter}">Age</label>
                    <div class="input-group">
                        <i class="fas fa-calendar-alt"></i>
                        <input type="number" id="petAge_${petCounter}" name="petAge_${petCounter}" min="0" max="30" placeholder="Years">
                    </div>
                    <span class="error-message" id="petAge_${petCounter}Error"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label>Pet Type *</label>
                <div class="pet-type-grid">
                    <label class="pet-type-option">
                        <input type="radio" name="petType_${petCounter}" value="dog" required>
                        <i class="fas fa-dog"></i>
                        <span>Dog</span>
                    </label>
                    <label class="pet-type-option">
                        <input type="radio" name="petType_${petCounter}" value="cat" required>
                        <i class="fas fa-cat"></i>
                        <span>Cat</span>
                    </label>
                    <label class="pet-type-option">
                        <input type="radio" name="petType_${petCounter}" value="bird" required>
                        <i class="fas fa-dove"></i>
                        <span>Bird</span>
                    </label>
                    <label class="pet-type-option">
                        <input type="radio" name="petType_${petCounter}" value="fish" required>
                        <i class="fas fa-fish"></i>
                        <span>Fish</span>
                    </label>
                    <label class="pet-type-option">
                        <input type="radio" name="petType_${petCounter}" value="rabbit" required>
                        <i class="fas fa-paw"></i>
                        <span>Rabbit</span>
                    </label>
                    <label class="pet-type-option">
                        <input type="radio" name="petType_${petCounter}" value="other" required>
                        <i class="fas fa-paw"></i>
                        <span>Other</span>
                    </label>
                </div>
                <span class="error-message" id="petType_${petCounter}Error"></span>
            </div>
            
            <div class="dynamic-form-grid">
                <div class="form-group">
                    <label for="petBreed_${petCounter}">Breed</label>
                    <div class="input-group">
                        <i class="fas fa-dna"></i>
                        <input type="text" id="petBreed_${petCounter}" name="petBreed_${petCounter}" placeholder="e.g., Golden Retriever, Persian...">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="petSize_${petCounter}">Size</label>
                    <div class="input-group">
                        <i class="fas fa-ruler"></i>
                        <select id="petSize_${petCounter}" name="petSize_${petCounter}">
                            <option value="">Select size</option>
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="extra-large">Extra Large</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="petPersonality_${petCounter}">Personality & Behavior</label>
                <div class="input-group">
                    <i class="fas fa-heart"></i>
                    <textarea id="petPersonality_${petCounter}" name="petPersonality_${petCounter}" rows="2" placeholder="e.g., Friendly, energetic, calm, shy..."></textarea>
                </div>
            </div>
            
            <div class="form-group">
                <label for="petCareInstructions_${petCounter}">Care Instructions</label>
                <div class="input-group">
                    <i class="fas fa-clipboard-list"></i>
                    <textarea id="petCareInstructions_${petCounter}" name="petCareInstructions_${petCounter}" rows="3" placeholder="Feeding schedule, exercise needs, medications, special care..."></textarea>
                </div>
            </div>
            
            <div class="special-needs-section">
                <div class="special-needs-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Special Requirements</span>
                </div>
                <div class="form-group">
                    <label for="petSpecialNeeds_${petCounter}">Medical Conditions, Allergies, or Special Needs</label>
                    <div class="input-group">
                        <i class="fas fa-notes-medical"></i>
                        <textarea id="petSpecialNeeds_${petCounter}" name="petSpecialNeeds_${petCounter}" rows="2" placeholder="Any medical conditions, allergies, medications, or special care requirements..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', petHTML);
    
    // Add event listeners for pet type selection
    const petTypeOptions = document.querySelectorAll(`input[name="petType_${petCounter}"]`);
    petTypeOptions.forEach(option => {
        option.addEventListener('change', function() {
            updatePetTypeSelection(petCounter, this.value);
        });
    });
    
    // Scroll to the new section
    document.getElementById(`pet-${petCounter}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Remove Child Section
function removeChildSection(childId) {
    const childCard = document.getElementById(`child-${childId}`);
    if (childCard) {
        childCard.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            childCard.remove();
        }, 300);
    }
}

// Remove Pet Section
function removePetSection(petId) {
    const petCard = document.getElementById(`pet-${petId}`);
    if (petCard) {
        petCard.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            petCard.remove();
        }, 300);
    }
}

// Toggle School Sections
function toggleSchoolSections(childId, schoolType) {
    const schoolHours = document.getElementById(`schoolHours_${childId}`);
    const homeschooledInfo = document.getElementById(`homeschooledInfo_${childId}`);
    
    if (schoolType === 'regular') {
        schoolHours.style.display = 'block';
        homeschooledInfo.style.display = 'none';
    } else if (schoolType === 'homeschooled') {
        schoolHours.style.display = 'none';
        homeschooledInfo.style.display = 'block';
    }
}

// Update Pet Type Selection
function updatePetTypeSelection(petId, petType) {
    const petCard = document.getElementById(`pet-${petId}`);
    const petTypeOptions = petCard.querySelectorAll('.pet-type-option');
    
    petTypeOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.querySelector('input').value === petType) {
            option.classList.add('selected');
        }
    });
}

// Initialize Customer Form Validation
function initializeCustomerValidation() {
    const form = document.getElementById('customerSignupForm');
    if (!form) return;
    
    // Basic field validation
    const fieldsToValidate = [
        { id: 'customerName', validator: null, errorMessage: 'Please enter your full name' },
        { id: 'customerDOB', validator: validateDateOfBirth, errorMessage: 'Please enter a valid date of birth' },
        { id: 'customerArea', validator: null, errorMessage: 'Please select your area' },
        { id: 'customerEmail', validator: validateEmail, errorMessage: 'Please enter a valid email address' },
        { id: 'customerPhone', validator: validatePhone, errorMessage: 'Please enter a valid Lebanese phone number' },
        { id: 'customerPassword', validator: validatePassword, errorMessage: 'Password must be at least 8 characters long' },
        { id: 'customerConfirmPassword', validator: null, errorMessage: 'Passwords do not match' }
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
    
    // Password confirmation validation
    const confirmPassword = document.getElementById('customerConfirmPassword');
    if (confirmPassword) {
        confirmPassword.addEventListener('blur', function() {
            const password = document.getElementById('customerPassword').value;
            const confirmPass = this.value;
            
            if (confirmPass && password !== confirmPass) {
                showError('customerConfirmPassword', 'Passwords do not match');
            } else if (confirmPass) {
                clearError('customerConfirmPassword');
            }
        });
    }
    
    // Terms validation
    const termsCheckbox = document.getElementById('customerTermsAccepted');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                showError('customerTermsAccepted', 'You must accept the terms and conditions');
            } else {
                clearError('customerTermsAccepted');
            }
        });
    }
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        validateCustomerForm();
    });
}

// Validate Customer Form
function validateCustomerForm() {
    let isValid = true;
    
    // Validate basic fields
    const basicFields = [
        { id: 'customerName', validator: null, errorMessage: 'Please enter your full name' },
        { id: 'customerDOB', validator: validateDateOfBirth, errorMessage: 'Please enter a valid date of birth' },
        { id: 'customerArea', validator: null, errorMessage: 'Please select your area' },
        { id: 'customerEmail', validator: validateEmail, errorMessage: 'Please enter a valid email address' },
        { id: 'customerPhone', validator: validatePhone, errorMessage: 'Please enter a valid Lebanese phone number' },
        { id: 'customerPassword', validator: validatePassword, errorMessage: 'Password must be at least 8 characters long' }
    ];
    
    basicFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && !validateField(field.id, element.value, field.validator, field.errorMessage)) {
            isValid = false;
        }
    });
    
    // Validate password confirmation
    const password = document.getElementById('customerPassword').value;
    const confirmPassword = document.getElementById('customerConfirmPassword').value;
    if (password !== confirmPassword) {
        showError('customerConfirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    // Validate terms acceptance
    const termsCheckbox = document.getElementById('customerTermsAccepted');
    if (!termsCheckbox.checked) {
        showError('customerTermsAccepted', 'You must accept the terms and conditions');
        isValid = false;
    }
    
    // Validate children sections
    const childrenCards = document.querySelectorAll('.child-card');
    childrenCards.forEach(card => {
        const childId = card.id.split('-')[1];
        if (!validateChildSection(childId)) {
            isValid = false;
        }
    });
    
    // Validate pets sections
    const petsCards = document.querySelectorAll('.pet-card');
    petsCards.forEach(card => {
        const petId = card.id.split('-')[1];
        if (!validatePetSection(petId)) {
            isValid = false;
        }
    });
    
    if (isValid) {
        submitCustomerForm();
    }
}

// Validate Child Section
function validateChildSection(childId) {
    let isValid = true;
    
    const childName = document.getElementById(`childName_${childId}`);
    const childAge = document.getElementById(`childAge_${childId}`);
    const schoolType = document.querySelector(`input[name="schoolType_${childId}"]:checked`);
    
    if (!childName || !childName.value.trim()) {
        showError(`childName_${childId}`, 'Please enter the child\'s name');
        isValid = false;
    }
    
    if (!childAge || !childAge.value || parseInt(childAge.value) < 0 || parseInt(childAge.value) > 18) {
        showError(`childAge_${childId}`, 'Please enter a valid age (0-18)');
        isValid = false;
    }
    
    if (!schoolType) {
        showError(`schoolType_${childId}`, 'Please select school type');
        isValid = false;
    }
    
    return isValid;
}

// Validate Pet Section
function validatePetSection(petId) {
    let isValid = true;
    
    const petName = document.getElementById(`petName_${petId}`);
    const petType = document.querySelector(`input[name="petType_${petId}"]:checked`);
    
    if (!petName || !petName.value.trim()) {
        showError(`petName_${petId}`, 'Please enter the pet\'s name');
        isValid = false;
    }
    
    if (!petType) {
        showError(`petType_${petId}`, 'Please select pet type');
        isValid = false;
    }
    
    return isValid;
}

// Submit Customer Form
function submitCustomerForm() {
    const submitBtn = document.querySelector('#customerSignupForm .btn-auth');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    // Collect form data
    const formData = new FormData(document.getElementById('customerSignupForm'));
    
    // Add children data
    const childrenData = [];
    const childrenCards = document.querySelectorAll('.child-card');
    childrenCards.forEach(card => {
        const childId = card.id.split('-')[1];
        const childData = {
            name: document.getElementById(`childName_${childId}`).value,
            age: document.getElementById(`childAge_${childId}`).value,
            hobbies: document.getElementById(`childHobbies_${childId}`).value,
            schoolType: document.querySelector(`input[name="schoolType_${childId}"]:checked`).value,
            specialNeeds: document.getElementById(`childSpecialNeeds_${childId}`).value
        };
        
        if (childData.schoolType === 'regular') {
            childData.schoolHours = {
                monday: {
                    start: document.querySelector(`input[name="mondayStart_${childId}"]`).value,
                    end: document.querySelector(`input[name="mondayEnd_${childId}"]`).value
                },
                tuesday: {
                    start: document.querySelector(`input[name="tuesdayStart_${childId}"]`).value,
                    end: document.querySelector(`input[name="tuesdayEnd_${childId}"]`).value
                },
                wednesday: {
                    start: document.querySelector(`input[name="wednesdayStart_${childId}"]`).value,
                    end: document.querySelector(`input[name="wednesdayEnd_${childId}"]`).value
                },
                thursday: {
                    start: document.querySelector(`input[name="thursdayStart_${childId}"]`).value,
                    end: document.querySelector(`input[name="thursdayEnd_${childId}"]`).value
                },
                friday: {
                    start: document.querySelector(`input[name="fridayStart_${childId}"]`).value,
                    end: document.querySelector(`input[name="fridayEnd_${childId}"]`).value
                }
            };
        } else if (childData.schoolType === 'homeschooled') {
            childData.homeschoolSchedule = document.getElementById(`homeschoolSchedule_${childId}`).value;
        }
        
        childrenData.push(childData);
    });
    
    // Add pets data
    const petsData = [];
    const petsCards = document.querySelectorAll('.pet-card');
    petsCards.forEach(card => {
        const petId = card.id.split('-')[1];
        const petData = {
            name: document.getElementById(`petName_${petId}`).value,
            age: document.getElementById(`petAge_${petId}`).value,
            type: document.querySelector(`input[name="petType_${petId}"]:checked`).value,
            breed: document.getElementById(`petBreed_${petId}`).value,
            size: document.getElementById(`petSize_${petId}`).value,
            personality: document.getElementById(`petPersonality_${petId}`).value,
            careInstructions: document.getElementById(`petCareInstructions_${petId}`).value,
            specialNeeds: document.getElementById(`petSpecialNeeds_${petId}`).value
        };
        petsData.push(petData);
    });
    
    formData.set('children', JSON.stringify(childrenData));
    formData.set('pets', JSON.stringify(petsData));
    
    // Simulate API call
    setTimeout(() => {
        console.log('Customer signup data:', Object.fromEntries(formData));
        
        showSuccessMessage('Customer account created successfully! Welcome to CareConnect!');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }, 3000);
}

// Initialize Phone Formatting
function initializePhoneFormatting() {
    const phoneInput = document.getElementById('customerPhone');
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
}

// Add CSS for slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
`;
document.head.appendChild(style);
