// Test the natural language parser
const { parseNaturalTextServer } = require('./backend/db');

// Test cases
const testCases = [
  "Maths class Mon & Wed 10 to 12",
  "Physics lab Thursday 2pm to 4pm",
  "Chemistry practical Friday 9am-11am",
  "English class Tuesday and Thursday 1pm to 3pm"
];

console.log('Testing Natural Language Parser:\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase}"`);
  const result = parseNaturalTextServer(testCase);
  console.log('Parsed result:', JSON.stringify(result, null, 2));
  console.log('---\n');
});

console.log('Parser test completed!');