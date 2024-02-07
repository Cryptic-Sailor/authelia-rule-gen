let ruleId = 0;

function addRuleForm(rule = null) {
    ruleId++;
    const container = document.getElementById('rulesContainer');
    const ruleForm = document.createElement('div');
    ruleForm.setAttribute('class', 'ruleForm');
    ruleForm.setAttribute('id', `ruleForm-${ruleId}`);
    ruleForm.innerHTML = `
        <div><label>Domain:</label><input type="text" name="domain"></div>
        <div><label>Domain Regex:</label><input type="text" name="domain_regex"></div>
        <div><label>Policy:</label>
            <select name="policy">
                <option value="one_factor">One-Factor</option>
                <option value="two_factor">Two-Factor</option>
                <option value="bypass">Bypass</option>
                <option value="deny">Deny</option>
            </select>
        </div>
        <div><label>Networks (comma-separated):</label><input type="text" name="networks"></div>
        <div><label>Subject (JSON format):</label><input type="text" name="subject" rows="2"></textarea></div>
        <div><label>Methods (comma-separated):</label><input type="text" name="methods"></div>
        <div><label>Resources (comma-separated regexes):</label><input type="text" name="resources"></div>
        <div><label>Query (JSON format):</label><input type="text" name="query" rows="2"></textarea></div>
        <button type="button" onclick="removeRuleForm(${ruleId})">Remove Rule</button>
    `;
    container.appendChild(ruleForm);

    // Now that ruleForm is appended to DOM, set values
    if (rule) {
        ruleForm.querySelector('[name="domain"]').value = rule.domain || '';
        ruleForm.querySelector('[name="domain_regex"]').value = rule.domain_regex || '';
        ruleForm.querySelector('[name="policy"]').value = rule.policy || 'deny'; // Default to 'deny' if not specified
        ruleForm.querySelector('[name="networks"]').value = rule.networks ? rule.networks.join(',') : '';
        ruleForm.querySelector('[name="subject"]').value = rule.subject ? JSON.stringify(rule.subject) : '';
        ruleForm.querySelector('[name="methods"]').value = rule.methods ? rule.methods.join(',') : '';
        ruleForm.querySelector('[name="resources"]').value = rule.resources ? rule.resources.join(',') : '';
        ruleForm.querySelector('[name="query"]').value = rule.query ? JSON.stringify(rule.query) : '';
    }
}


function removeRuleForm(ruleId) {
    const ruleForm = document.getElementById(`ruleForm-${ruleId}`);
    ruleForm.remove();
}

document.getElementById('generateBtn').addEventListener('click', generateYAML);

function generateYAML() {
    const rules = [];
    document.querySelectorAll('.ruleForm').forEach(form => {
        const rule = {};
        form.querySelectorAll('[name]').forEach(input => {
            const { name, value } = input;
            // Only add the field to the rule object if it's populated
            if (value) {
                if (name === 'subject' || name === 'query') {
                    try {
                        rule[name] = JSON.parse(value);
                    } catch (e) {
                        console.error(`Error parsing JSON for ${name}: ${e.message}`);
                    }
                } else if (name === 'networks' || name === 'methods' || name === 'resources') {
                    rule[name] = value.split(',').map(item => item.trim()).filter(item => item);
                } else {
                    rule[name] = value;
                }
            }
        });
        // Only add the rule to the rules array if it has more than the 'policy' field
        if (Object.keys(rule).length > 1 || (Object.keys(rule).length === 1 && rule.policy)) {
            rules.push(rule);
        }
    });

    fetch('/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules }),
    })
    .then(response => response.text())
    .then(data => {
        document.getElementById('yamlOutput').textContent = data;
    }).catch(error => {
        console.error('Error generating YAML:', error);
        alert('Error generating YAML. Check console for details.');
    });
}


function importYAML() {
    const yamlContent = document.getElementById('importYamlText').value;
    try {
        const parsedYaml = jsyaml.load(yamlContent); // Use js-yaml library to parse
        
        if (parsedYaml && parsedYaml.access_control && Array.isArray(parsedYaml.access_control.rules)) {
            // Clear existing rules
            document.getElementById('rulesContainer').innerHTML = '';
            ruleId = 0; // Reset ruleId to avoid id conflict when adding new forms

            // Iterate over each rule in the YAML and add a form for it
            parsedYaml.access_control.rules.forEach(rule => {
                if (rule) { // Ensure rule is defined
                    addRuleForm(rule);
                }
            });
        } else {
            alert('Invalid YAML format for rules.');
        }
    } catch (err) {
        alert('Error parsing YAML: ' + err.message);
    }
	saveAllFields();
}

// function to save all fields
function saveAllFields() {
    document.querySelectorAll('input[type="text"]').forEach(input => {
        const fieldName = input.name;
        const fieldValue = input.value;
        if (fieldValue) {
            saveField(fieldName, fieldValue);
        }

        // Create dropdown
        const dropdown = document.createElement('select');
        dropdown.style.display = 'none'; // Initially hide the dropdown
        input.parentNode.appendChild(dropdown);

        // Show dropdown when input is focused
        input.addEventListener('focus', function() {
            fetch('/getFields')
                .then(response => response.json())
                .then(data => {
                    const fields = data.fields;
                    dropdown.innerHTML = `<option value="">Select or enter new...</option>`;
                    fields.forEach(field => {
                        if (field.fieldName === fieldName) {
                            const option = document.createElement('option');
                            option.value = field.fieldValue;
                            option.textContent = field.fieldValue;
                            dropdown.appendChild(option);
                        }
                    });
                    dropdown.style.display = 'block'; // Show the dropdown
                });
        });

        // Hide dropdown when input is blurred
		input.addEventListener('blur', function(e) {
			// Check if the relatedTarget is the dropdown or a child of the dropdown
			if (e.relatedTarget !== dropdown && !dropdown.contains(e.relatedTarget)) {
				dropdown.style.display = 'none'; // Hide the dropdown
			}
		});

        // Update input value when an option is selected from the dropdown
        dropdown.addEventListener('change', function() {
            if (dropdown.value) {
                input.value = dropdown.value;
            }
        });
    });
}

// function to save a single field
function saveField(fieldName, fieldValue) {
    // First, check if the field already exists
    fetch('/getField', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fieldName, fieldValue }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.field) {
            // If the field already exists, do not save it
            console.log('Field already exists');
        } else {
            // If the field does not exist, save it
            fetch('/saveField', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fieldName, fieldValue }),
            })
            .then(response => response.json())
            .catch(error => console.error('Error:', error));
        }
    })
    .catch(error => console.error('Error:', error));
}

// function to fetch and populate fields
function fetchAndPopulateFields() {
    fetch('/getFields')
        .then(response => response.json())
        .then(data => {
            const fields = data.fields;
            document.querySelectorAll('input[type="text"]').forEach(input => {
                const dropdown = document.createElement('select');
                dropdown.innerHTML = `<option value="">Select or enter new...</option>`;
                fields.forEach(field => {
                    if (field.fieldName === input.getAttribute('name')) {
                        const option = document.createElement('option');
                        option.value = field.fieldValue;
                        option.textContent = field.fieldValue;
                        dropdown.appendChild(option);
                    }
                });
                input.parentNode.insertBefore(dropdown, input.nextSibling);
                dropdown.onchange = () => {
                    if (dropdown.value) {
                        input.value = dropdown.value;
                    }
                };
            });
        });
}

// Call fetchAndPopulateFields function
fetchAndPopulateFields();

// Call saveAllFields function when the YAML is generated
// replace 'generateYaml' with the actual function that generates the YAML
document.getElementById('generateBtn').addEventListener('click', function() {
	// generateYaml(); // call the function that generates the YAML
	saveAllFields(); // save all fields after generating the YAML
});

// Initialize with one rule form
addRuleForm();
