import { UserRole } from '../enums/roles.enum';
import { AppDataSource } from '../../data-source';
import { Role } from '../entities/role.entity';

async function seedRoles() {
  await AppDataSource.initialize();
  console.log('DataSource initialized');

  console.log(
    'Loaded entities:',
    AppDataSource.entityMetadatas.map((e) => e.name),
  );

  const roleRepo = AppDataSource.getRepository(Role);

  const roles = Object.values(UserRole);

  for (const name of roles) {
    const exists = await roleRepo.findOne({ where: { name } });
    if (!exists) {
      const role = roleRepo.create({ name });
      await roleRepo.save(role);
      console.log(`Inserted role: ${name}`);
    } else {
      console.log(`Role already exists: ${name}`);
    }
  }

  console.log('Roles seeded successfully!');
  await AppDataSource.destroy();
}

seedRoles().catch((err) => {
  console.error(err);
  AppDataSource.destroy();
});
