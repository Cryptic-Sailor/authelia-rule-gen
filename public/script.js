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
        <div><label>Subject (JSON format):</label><textarea name="subject" rows="2"></textarea></div>
        <div><label>Methods (comma-separated):</label><input type="text" name="methods"></div>
        <div><label>Resources (comma-separated regexes):</label><input type="text" name="resources"></div>
        <div><label>Query (JSON format):</label><textarea name="query" rows="2"></textarea></div>
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
}

// function fetchAndPopulateFields() {
//     fetch('/getFields')
//         .then(response => response.json())
//         .then(data => {
//             const fields = data.fields;
//             document.querySelectorAll('input[type="text"]').forEach(input => {
//                 const dropdown = document.createElement('select');
//                 dropdown.innerHTML = `<option value="">Select or enter new...</option>`;
//                 fields.forEach(field => {
//                     if (field.fieldName === input.getAttribute('name')) {
//                         const option = document.createElement('option');
//                         option.value = field.fieldValue;
//                         option.textContent = field.fieldValue;
//                         dropdown.appendChild(option);
//                     }
//                 });
//                 input.parentNode.insertBefore(dropdown, input.nextSibling);
//                 dropdown.onchange = () => {
//                     if (dropdown.value) {
//                         input.value = dropdown.value;
//                     }
//                 };
//             });
//         });
// }

// fetchAndPopulateFields();


// function initializeSaveFieldButtons() {
//     document.querySelectorAll('.saveFieldBtn').forEach(button => {
//         button.addEventListener('click', function() {
//             const input = this.previousElementSibling;
//             const fieldName = input.name;
//             const fieldValue = input.value;
//             if (fieldValue) {
//                 saveField(fieldName, fieldValue);
//             } else {
//                 alert("Please enter a value to save.");
//             }
//         });
//     });
// }

// function saveField(fieldName, fieldValue) {
//     fetch('/saveField', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ fieldName, fieldValue }),
//     })
//     .then(response => response.json())
//     .then(data => {
//         // Optionally, re-fetch fields to update dropdowns
//         fetchAndPopulateFields();
//         alert("Field value saved successfully.");
//     })
//     .catch(error => {
//         console.error('Error saving field:', error);
//         alert('Error saving field. Check console for details.');
//     });
// }


document.getElementById('generateBtn').addEventListener('click', generateYAML);

// Initialize with one rule form
addRuleForm();
