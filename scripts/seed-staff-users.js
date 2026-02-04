const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'smartrep_portal';

async function seedStaffUsers() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const staffUsersCollection = db.collection('staff_users');
    
    // Clear existing staff users
    await staffUsersCollection.deleteMany({});
    console.log('Cleared existing staff users');
    
    // Create staff users
    const staffUsers = [
      {
        id: uuidv4(),
        name: 'Jan Christensen',
        address: 'Antonio Costas Vej 15, 7000 Fredericia',
        email: 'jc@smartrep.dk',
        phone: '+45 25728000',
        roles: ['admin', 'technician_admin'],
        password: await bcrypt.hash('Admin123', 10),
        createdAt: new Date(),
        isActive: true
      },
      {
        id: uuidv4(),
        name: 'Luise Gade',
        address: 'Antonio Costas Vej 15, 7000 Fredericia',
        email: 'lg@smartrep.dk',
        phone: '+45 48882512',
        roles: ['admin', 'technician_admin'],
        password: await bcrypt.hash('Admin123', 10),
        createdAt: new Date(),
        isActive: true
      }
    ];
    
    // Insert staff users
    for (const user of staffUsers) {
      await staffUsersCollection.insertOne(user);
      console.log(`  ✓ Created staff user: ${user.name} (${user.email})`);
    }
    
    console.log('\n✅ STAFF USERS SEEDED!');
    console.log('========================');
    console.log(`  Staff brugere: ${staffUsers.length}`);
    console.log('\n📧 Staff login credentials:');
    console.log('  jc@smartrep.dk / Admin123 (Jan - Admin + Tekniker Admin)');
    console.log('  lg@smartrep.dk / Admin123 (Luise - Admin + Tekniker Admin)');
    
  } catch (error) {
    console.error('Error seeding staff users:', error);
  } finally {
    await client.close();
  }
}

seedStaffUsers();