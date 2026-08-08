exports.up = async knex => {
  if (!(await knex.schema.hasColumn('testimonials', 'featured'))) await knex.schema.alterTable('testimonials', table => table.boolean('featured').notNullable().defaultTo(false));
};
exports.down = async knex => { if (await knex.schema.hasColumn('testimonials', 'featured')) await knex.schema.alterTable('testimonials', table => table.dropColumn('featured')); };
