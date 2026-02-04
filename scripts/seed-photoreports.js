const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'smartrep_portal';

async function seedPhotoReports() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Get some planned tasks
    const tasks = await db.collection('tasks').find({ status: 'planned' }).limit(3).toArray();
    const admin = await db.collection('users').findOne({ role: 'admin' });
    
    console.log('Creating photo reports for', tasks.length, 'tasks');
    
    for (const task of tasks) {
      const report = {
        id: uuidv4(),
        taskId: task.id,
        companyId: task.companyId,
        damages: task.damages?.map(d => ({
          ...d,
          beforePhoto: null,
          afterPhoto: null
        })) || [],
        status: 'pending',
        notes: `Fotorapport for opgave #${task.taskNumber}`,
        createdBy: admin.id,
        createdByName: admin.name,
        createdAt: new Date()
      };
      
      await db.collection('photo_reports').insertOne(report);
      console.log('Created report for task #' + task.taskNumber);
    }
    
    // Create a communication log
    await db.collection('communications').insertOne({
      id: uuidv4(),
      type: 'email',
      taskId: tasks[0]?.id,
      to: 'kunde@test.dk',
      subject: 'Ordrebekræftelse - Opgave #' + tasks[0]?.taskNumber,
      content: 'Test email',
      status: 'sent',
      sentBy: admin.id,
      sentByName: admin.name,
      createdAt: new Date()
    });
    
    await db.collection('communications').insertOne({
      id: uuidv4(),
      type: 'sms',
      taskId: tasks[1]?.id,
      to: '+45 1234 5678',
      message: 'Hej! Vi kommer i morgen kl. 9 til reparation.',
      status: 'sent',
      sentBy: admin.id,
      sentByName: admin.name,
      createdAt: new Date()
    });
    
    console.log('Created demo communications');
    console.log('Done!');
    
  } finally {
    await client.close();
  }
}

seedPhotoReports();
