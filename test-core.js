// Core functionality test for Hanu-Planner
const Database = require('./backend/models/Database');
const ChatBot = require('./backend/services/ChatBot');
const TimetableGenerator = require('./backend/services/TimetableGenerator');

async function testCore() {
  console.log('🧪 Testing Hanu-Planner Core Functionality\n');
  
  const db = new Database();
  
  try {
    // Test 1: Database initialization
    console.log('1. Testing database initialization...');
    await db.initialize();
    console.log('✅ Database initialized successfully\n');
    
    // Test 2: Create a test course
    console.log('2. Testing course creation...');
    const courseId = await db.createCourse({
      userId: 1,
      name: 'Data Structures',
      code: 'CS201',
      priority: 1,
      credits: 3,
      color: '#3B82F6',
      description: 'Introduction to data structures and algorithms'
    });
    console.log(`✅ Course created with ID: ${courseId}\n`);
    
    // Test 3: Create test sessions
    console.log('3. Testing session creation...');
    const sessionId1 = await db.createSession({
      courseId,
      type: 'lecture',
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '10:30',
      location: 'Room A101',
      instructor: 'Dr. Smith'
    });
    
    const sessionId2 = await db.createSession({
      courseId,
      type: 'lab',
      dayOfWeek: 3, // Wednesday
      startTime: '14:00',
      endTime: '16:00',
      location: 'Lab B201',
      instructor: 'Dr. Smith'
    });
    console.log(`✅ Sessions created: ${sessionId1}, ${sessionId2}\n`);
    
    // Test 4: ChatBot functionality
    console.log('4. Testing ChatBot...');
    const chatBot = new ChatBot(db);
    const chatResponse = await chatBot.processMessage('Show my schedule', 1);
    console.log(`✅ ChatBot response: ${chatResponse.text.substring(0, 100)}...\n`);
    
    // Test 5: Timetable generation
    console.log('5. Testing timetable generation...');
    const generator = new TimetableGenerator(db);
    const timetable = await generator.generateTimetable(1);
    console.log(`✅ Timetable generated with score: ${timetable.score}/100`);
    console.log(`   Sessions: ${timetable.stats.totalSessions}, Hours: ${timetable.stats.totalHours}\n`);
    
    // Test 6: Data retrieval
    console.log('6. Testing data retrieval...');
    const courses = await db.getCoursesByUser(1);
    const sessions = await db.getSessionsByUser(1);
    console.log(`✅ Retrieved ${courses.length} courses and ${sessions.length} sessions\n`);
    
    console.log('🎉 All core functionality tests passed!');
    console.log('\nThe Hanu-Planner backend is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await db.close();
  }
}

testCore();
