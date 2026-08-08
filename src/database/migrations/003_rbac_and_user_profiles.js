exports.up = async knex => {
  const hasUsername = await knex.schema.hasColumn('users', 'username');
  if (!hasUsername) {
    await knex.schema.alterTable('users', table => {
      table.string('username', 80).nullable().unique().after('name');
      table.string('first_name', 80).nullable().after('name');
      table.string('last_name', 80).nullable().after('first_name');
      table.string('phone', 60).nullable().after('email');
      table.string('profile_photo', 255).nullable();
      table.timestamp('last_login_at').nullable();
      table.timestamp('locked_at').nullable();
    });
  }
  await knex('roles').insert([{ name: 'super_admin' }, { name: 'staff' }]).onConflict('name').ignore();
  const superAdmin = await knex('roles').where({ name: 'super_admin' }).first();
  const admin = await knex('users').where({ email: 'admin@example.com' }).first();
  if (admin && superAdmin) await knex('user_roles').insert({ user_id: admin.id, role_id: superAdmin.id }).onConflict(['user_id', 'role_id']).ignore();
};

exports.down = async knex => {
  await knex('user_roles').whereIn('role_id', knex('roles').whereIn('name', ['super_admin', 'staff']).select('id')).del();
  await knex('roles').whereIn('name', ['super_admin', 'staff']).del();
  await knex.schema.alterTable('users', table => {
    table.dropColumns('username', 'first_name', 'last_name', 'phone', 'profile_photo', 'last_login_at', 'locked_at');
  });
};
