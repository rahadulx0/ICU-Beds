require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Hospital = require('./models/Hospital');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Hospital.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@icubeds.com',
      password: 'admin123',
      role: 'admin',
      phone: '+8801700000001',
    });

    // Create a moderator
    const moderator = await User.create({
      name: 'Regional Moderator',
      email: 'moderator@icubeds.com',
      password: 'mod123',
      role: 'moderator',
      phone: '+8801700000002',
    });

    // Create hospital rep
    const rep = await User.create({
      name: 'Hospital Representative',
      email: 'rep@icubeds.com',
      password: 'rep123',
      role: 'hospital_rep',
      phone: '+8801700000003',
    });

    // Create a driver
    const driver = await User.create({
      name: 'Ambulance Driver',
      email: 'driver@icubeds.com',
      password: 'driver123',
      role: 'driver',
      phone: '+8801700000004',
      vehicle_details: {
        plate_number: 'DHA-1234',
        vehicle_type: 'advanced',
      },
    });

    // Create a regular user
    await User.create({
      name: 'Regular User',
      email: 'user@icubeds.com',
      password: 'user123',
      role: 'user',
      phone: '+8801700000005',
    });

    // Create hospitals (Dhaka, Bangladesh area)
    const hospitals = await Hospital.insertMany([
      {
        name: 'Dhaka Medical College Hospital',
        address: 'Secretariat Rd, Dhaka 1000',
        location: { type: 'Point', coordinates: [90.3978, 23.7260] },
        total_icu_beds: 50,
        available_icu_beds: 12,
        contact: { phone: '+880-2-55165001', email: 'info@dmch.gov.bd' },
        managed_by: [rep._id, moderator._id],
      },
      {
        name: 'Square Hospital',
        address: '18/F, BU Bir Uttam Qazi Nuruzzaman Sarak, Dhaka 1205',
        location: { type: 'Point', coordinates: [90.3880, 23.7505] },
        total_icu_beds: 30,
        available_icu_beds: 8,
        contact: { phone: '+880-2-8159457', email: 'info@squarehospital.com' },
        managed_by: [moderator._id],
      },
      {
        name: 'United Hospital',
        address: 'Plot 15, Rd 71, Dhaka 1212',
        location: { type: 'Point', coordinates: [90.4125, 23.7960] },
        total_icu_beds: 40,
        available_icu_beds: 0,
        contact: { phone: '+880-2-8836000', email: 'info@uhlbd.com' },
        managed_by: [moderator._id],
      },
      {
        name: 'Evercare Hospital Dhaka',
        address: 'Plot 81, Block E, Bashundhara R/A, Dhaka 1229',
        location: { type: 'Point', coordinates: [90.4270, 23.8135] },
        total_icu_beds: 35,
        available_icu_beds: 15,
        contact: { phone: '+880-2-55066777', email: 'info@evercarebd.com' },
        managed_by: [],
      },
      {
        name: 'Labaid Specialized Hospital',
        address: 'House 6, Rd 4, Dhanmondi, Dhaka 1205',
        location: { type: 'Point', coordinates: [90.3746, 23.7425] },
        total_icu_beds: 25,
        available_icu_beds: 3,
        contact: { phone: '+880-2-9116961', email: 'info@labaidgroup.com' },
        managed_by: [],
      },
      {
        name: 'Ibn Sina Hospital',
        address: 'House 48, Rd 9/A, Dhanmondi, Dhaka 1209',
        location: { type: 'Point', coordinates: [90.3763, 23.7469] },
        total_icu_beds: 20,
        available_icu_beds: 7,
        contact: { phone: '+880-2-8431371', email: 'info@ibnsinabd.com' },
        managed_by: [],
      },
      {
        name: 'National Heart Foundation',
        address: 'Plot 7/2, Section 2, Mirpur, Dhaka 1216',
        location: { type: 'Point', coordinates: [90.3590, 23.7952] },
        total_icu_beds: 45,
        available_icu_beds: 20,
        contact: { phone: '+880-2-8061315', email: 'info@nhf.org.bd' },
        managed_by: [],
      },
      {
        name: 'BIRDEM General Hospital',
        address: '122 Kazi Nazrul Islam Ave, Dhaka 1000',
        location: { type: 'Point', coordinates: [90.3930, 23.7390] },
        total_icu_beds: 30,
        available_icu_beds: 5,
        contact: { phone: '+880-2-8616641', email: 'info@birdem.org' },
        managed_by: [],
      },
    ]);

    // Assign first hospital to rep
    await User.findByIdAndUpdate(rep._id, {
      assigned_hospitals: [hospitals[0]._id],
    });

    // Assign hospitals to moderator
    await User.findByIdAndUpdate(moderator._id, {
      assigned_hospitals: [hospitals[0]._id, hospitals[1]._id, hospitals[2]._id],
    });

    console.log('\nSeed completed successfully!');
    console.log('\nTest accounts:');
    console.log('  Admin:        admin@icubeds.com / admin123');
    console.log('  Moderator:    moderator@icubeds.com / mod123');
    console.log('  Hospital Rep: rep@icubeds.com / rep123');
    console.log('  Driver:       driver@icubeds.com / driver123');
    console.log('  User:         user@icubeds.com / user123');
    console.log(`\n  ${hospitals.length} hospitals created`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
