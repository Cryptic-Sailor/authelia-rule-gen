const express = require('express');
const bodyParser = require('body-parser');
const yaml = require('js-yaml');
const app = express();
const port = 3000;
const db = require('./database');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.post('/generate', (req, res) => {
	const rules = req.body.rules;
	if (!Array.isArray(rules)) {
		return res.status(400).send('Invalid input: expected an array of rules');
	}

	const ruleData = {
		access_control: {
			default_policy: "deny",
			networks: [],
			rules: rules
		}
	};

	try {
		const yamlStr = yaml.dump(ruleData, { lineWidth: -1 });
		res.type('text/yaml');
		res.send(yamlStr);
	} catch (error) {
		res.status(500).send('Error generating YAML: ' + error.message);
	}
});

app.post('/saveField', (req, res) => {
	const { fieldName, fieldValue } = req.body;
	const stmt = db.prepare("INSERT INTO fields (fieldName, fieldValue) VALUES (?, ?)");
	stmt.run(fieldName, fieldValue, function(err) {
		if (err) {
			return res.status(500).json({ error: err.message });
		}
		res.json({ id: this.lastID });
	});
	stmt.finalize();
});

app.get('/getFields', (req, res) => {
	db.all("SELECT DISTINCT fieldName, fieldValue FROM fields", [], (err, rows) => {
		if (err) {
			return res.status(500).json({ error: err.message });
		}
		res.json({ fields: rows });
	});
});


app.post('/getField', (req, res) => {
	const { fieldName, fieldValue } = req.body;
	db.get("SELECT fieldValue FROM fields WHERE fieldName = ?", [fieldName], (err, row) => {
		if (err) {
			return res.status(500).json({ error: err.message });
		}
		res.json({ field: row, fieldValue, fieldName });
	});
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
