const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'smartrep_portal';

// Building parts and colors for random selection
const BUILDING_PARTS = ['pladedoer', 'aluprofil', 'bundstykke', 'traekarm', 'hjoerneprofil', 'glas', 'komposit_bundstykke', 'indv_karm'];
const COLORS = ['granit_80', 'granit_60', 'granit_70', 'granit_30', 'sort', 'hvid', 'soelv', 'ral_7016'];
const LOCATIONS = ['koekken', 'indgang', 'entre', 'alrum', 'stue', 'boernevaerelse', 'sovevaerelse', 'lille_bad', 'stort_bad', 'kontor', 'garage'];
const STATUSES = ['awaiting_confirmation', 'under_planning', 'planned'];
const CATEGORIES = ['foraflevering', 'service', 'oevrig'];
const WEATHER_TYPES = ['sun', 'rain', 'both'];

// Danish cities
const CITIES = [
  { city: 'København', postalCodes: ['1000', '1050', '1100', '1150', '1200', '2100', '2200', '2300', '2400', '2450'] },
  { city: 'Aarhus', postalCodes: ['8000', '8200', '8210', '8220', '8230', '8240', '8250', '8260', '8270'] },
  { city: 'Odense', postalCodes: ['5000', '5200', '5210', '5220', '5230', '5240', '5250', '5260', '5270'] },
  { city: 'Aalborg', postalCodes: ['9000', '9200', '9210', '9220', '9230', '9240', '9260', '9270', '9280'] },
  { city: 'Esbjerg', postalCodes: ['6700', '6705', '6710', '6715', '6720', '6731', '6740', '6752', '6753'] },
  { city: 'Randers', postalCodes: ['8900', '8920', '8930', '8940', '8950', '8960', '8970', '8981', '8983'] },
  { city: 'Kolding', postalCodes: ['6000', '6040', '6051', '6052', '6064', '6070', '6091', '6092', '6093'] },
  { city: 'Horsens', postalCodes: ['8700', '8721', '8722', '8723', '8732', '8740', '8751', '8752', '8762'] },
  { city: 'Vejle', postalCodes: ['7100', '7120', '7130', '7140', '7150', '7160', '7171', '7173', '7182'] },
  { city: 'Fredericia', postalCodes: ['7000', '7080'] }
];

// Danish street names
const STREETS = [
  'Hovedgaden', 'Strandvejen', 'Skovvej', 'Engvej', 'Bakkevej', 'Søndergade', 'Nørregade', 'Østergade', 'Vestergade',
  'Parkvej', 'Havnevej', 'Jernbanevej', 'Industrivej', 'Skolevej', 'Kirkevej', 'Møllevej', 'Bredgade', 'Adelgade',
  'Nygade', 'Lille Torv', 'Store Torv', 'Algade', 'Slotsgade', 'Åboulevarden', 'Banegårdspladsen'
];

// Danish first names
const FIRST_NAMES = ['Peter', 'Michael', 'Lars', 'Thomas', 'Henrik', 'Søren', 'Jens', 'Morten', 'Anders', 'Martin',
  'Anne', 'Mette', 'Kirsten', 'Hanne', 'Maria', 'Lene', 'Susanne', 'Karen', 'Lone', 'Pia'];

// Danish last names
const LAST_NAMES = ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen',
  'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen'];

// Helper functions
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPhone = () => `+45 ${randomInt(20, 99)}${randomInt(10, 99)} ${randomInt(10, 99)}${randomInt(10, 99)}`;

// Generate random date between Jan 2 and Jan 28, 2026
const randomDate = () => {
  const start = new Date('2026-01-02');
  const end = new Date('2026-01-28');
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
};

// Generate random damages (1-5)
const generateDamages = () => {
  const count = randomInt(1, 5);
  const damages = [];
  for (let i = 0; i < count; i++) {
    damages.push({
      id: uuidv4(),
      part: randomElement(BUILDING_PARTS),
      quantity: randomInt(1, 5),
      color: randomElement(COLORS),
      location: randomElement(LOCATIONS),
      notes: ''
    });
  }
  return damages;
};

// Generate task types based on damages
const generateTypes = (damages) => {
  const typeMap = {
    'pladedoer': 'PLA',
    'aluprofil': 'ALU',
    'bundstykke': 'BUN',
    'traekarm': 'TRÆ',
    'hjoerneprofil': 'ALU',
    'glas': 'GLA',
    'komposit_bundstykke': 'BUN',
    'indv_karm': 'TRÆ'
  };
  const types = [...new Set(damages.map(d => typeMap[d.part]).filter(Boolean))];
  return types;
};

async function seedData() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    const companiesCollection = db.collection('companies');
    const tasksCollection = db.collection('tasks');

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin123', 12);
    const customerPassword = await bcrypt.hash('welcome123', 12);

    // 1. Create 2 admin users
    console.log('\n📝 Creating admin users...');
    const admins = [
      {
        id: uuidv4(),
        email: 'admin1@smartrep.nu',
        password: hashedPassword,
        name: 'Admin Bruger 1',
        role: 'admin',
        phone: '+45 8282 2572',
        createdAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'admin2@smartrep.nu',
        password: hashedPassword,
        name: 'Admin Bruger 2',
        role: 'admin',
        phone: '+45 8282 2573',
        createdAt: new Date()
      }
    ];

    for (const admin of admins) {
      const exists = await usersCollection.findOne({ email: admin.email });
      if (!exists) {
        await usersCollection.insertOne(admin);
        console.log(`  ✓ Created admin: ${admin.email}`);
      } else {
        console.log(`  - Admin exists: ${admin.email}`);
      }
    }

    // 2. Create 5 construction companies
    console.log('\n🏢 Creating companies...');
    const companyNames = [
      'NordByg A/S',
      'DanHuse ApS',
      'Sjælland Byggeri',
      'Jysk Murermester',
      'Fyn Totalentreprise'
    ];

    const companies = [];
    for (let i = 0; i < 5; i++) {
      const cityData = CITIES[i % CITIES.length];
      const company = {
        id: uuidv4(),
        name: companyNames[i],
        address: `${randomElement(STREETS)} ${randomInt(1, 150)}`,
        postalCode: randomElement(cityData.postalCodes),
        city: cityData.city,
        invoiceEmail: `faktura@${companyNames[i].toLowerCase().replace(/\s+/g, '').replace(/[æøå]/g, c => ({æ:'ae',ø:'oe',å:'aa'}[c]))}.dk`,
        phone: randomPhone(),
        createdAt: new Date()
      };

      const exists = await companiesCollection.findOne({ name: company.name });
      if (!exists) {
        await companiesCollection.insertOne(company);
        console.log(`  ✓ Created company: ${company.name}`);
      } else {
        company.id = exists.id;
        console.log(`  - Company exists: ${company.name}`);
      }
      companies.push(company);
    }

    // 3. Create 5 contacts per company (25 total)
    console.log('\n👥 Creating contacts...');
    const contacts = [];
    for (const company of companies) {
      for (let i = 0; i < 5; i++) {
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const contact = {
          id: uuidv4(),
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, '').replace(/[æøå]/g, c => ({æ:'ae',ø:'oe',å:'aa'}[c]))}.dk`,
          password: customerPassword,
          name: `${firstName} ${lastName}`,
          role: 'customer',
          companyId: company.id,
          phone: randomPhone(),
          position: i === 0 ? 'Direktør' : randomElement(['Byggeleder', 'Projektleder', 'Byggeleder', 'Entrepriseleder', 'Konstruktør']),
          createdAt: new Date()
        };

        const exists = await usersCollection.findOne({ email: contact.email });
        if (!exists) {
          await usersCollection.insertOne(contact);
          console.log(`  ✓ Created contact: ${contact.name} (${company.name})`);
        } else {
          contact.id = exists.id;
          console.log(`  - Contact exists: ${contact.name}`);
        }
        contacts.push(contact);
      }
    }

    // 4. Create 5 tasks per company (25 total)
    console.log('\n📋 Creating tasks...');
    
    // Get highest task number
    const lastTask = await tasksCollection.find({}).sort({ taskNumber: -1 }).limit(1).toArray();
    let taskNumber = lastTask.length > 0 ? lastTask[0].taskNumber + 1 : 2;

    // Distribute statuses: ~8 new, ~9 active, ~8 planned
    const statusDistribution = [
      'awaiting_confirmation', 'awaiting_confirmation', 'awaiting_confirmation',
      'under_planning', 'under_planning', 'under_planning', 'under_planning',
      'planned', 'planned', 'planned',
      'awaiting_confirmation', 'awaiting_confirmation', 'awaiting_confirmation',
      'under_planning', 'under_planning', 'under_planning', 'under_planning',
      'planned', 'planned', 'planned',
      'awaiting_confirmation', 'awaiting_confirmation',
      'under_planning', 'under_planning',
      'planned'
    ];

    let statusIndex = 0;

    for (const company of companies) {
      const companyContacts = contacts.filter(c => c.companyId === company.id);
      
      for (let i = 0; i < 5; i++) {
        const contact = companyContacts[i % companyContacts.length];
        const cityData = CITIES[randomInt(0, CITIES.length - 1)];
        const createdAt = randomDate();
        const damages = generateDamages();
        const status = statusDistribution[statusIndex % statusDistribution.length];
        statusIndex++;

        // Generate deadline (7-21 days after creation)
        const deadline = new Date(createdAt);
        deadline.setDate(deadline.getDate() + randomInt(7, 21));

        // For planned tasks, add plannedDate
        let plannedDate = null;
        if (status === 'planned') {
          plannedDate = new Date(createdAt);
          plannedDate.setDate(plannedDate.getDate() + randomInt(3, 10));
        }

        const task = {
          id: uuidv4(),
          taskNumber: taskNumber++,
          companyId: company.id,
          companyName: company.name,
          contactName: contact.name,
          contactPhone: contact.phone,
          contactEmail: contact.email,
          address: `${randomElement(STREETS)} ${randomInt(1, 200)}`,
          postalCode: randomElement(cityData.postalCodes),
          city: cityData.city,
          caseNumber: `${company.name.substring(0, 2).toUpperCase()}-2026-${String(randomInt(100, 999))}`,
          isHouseEmpty: Math.random() > 0.6,
          owner1Name: Math.random() > 0.5 ? `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}` : '',
          owner1Phone: Math.random() > 0.5 ? randomPhone() : '',
          owner2Name: Math.random() > 0.7 ? `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}` : '',
          owner2Phone: Math.random() > 0.7 ? randomPhone() : '',
          status: status,
          category: randomElement(CATEGORIES),
          weatherType: randomElement(WEATHER_TYPES),
          estimatedTime: randomInt(1, 6),
          deadline: deadline,
          deadlineLocked: Math.random() > 0.7,
          damages: damages,
          types: generateTypes(damages),
          notes: Math.random() > 0.5 ? `Bemærkning til opgave #${taskNumber - 1}` : '',
          files: [],
          technicianId: null,
          plannedDate: plannedDate,
          createdAt: createdAt,
          createdBy: contact.id,
          idDays: Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24))
        };

        await tasksCollection.insertOne(task);
        console.log(`  ✓ Task #${task.taskNumber}: ${task.address}, ${task.city} [${status}] - ${damages.length} skader`);
      }
    }

    // Summary
    console.log('\n✅ SEED DATA COMPLETE!');
    console.log('========================');
    console.log(`  Admin brugere: 2`);
    console.log(`  Firmaer: 5`);
    console.log(`  Kontakter: 25`);
    console.log(`  Opgaver: 25`);
    console.log('\n📧 Admin login:');
    console.log('  admin1@smartrep.nu / Admin123');
    console.log('  admin2@smartrep.nu / Admin123');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seedData();
