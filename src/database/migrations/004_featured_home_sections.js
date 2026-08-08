exports.up = async knex => {
  if (!(await knex.schema.hasColumn('brands', 'featured'))) await knex.schema.alterTable('brands', table => { table.boolean('featured').notNullable().defaultTo(false); table.integer('display_order').notNullable().defaultTo(0); table.string('website_url', 255).nullable(); });
  if (!(await knex.schema.hasColumn('testimonials', 'display_order'))) await knex.schema.alterTable('testimonials', table => { table.integer('display_order').notNullable().defaultTo(0); table.string('position', 120).nullable(); table.string('review_title', 180).nullable(); table.string('product_purchased', 180).nullable(); });
};
exports.down = async knex => { await knex.schema.alterTable('brands', table => table.dropColumns('featured','display_order','website_url')); await knex.schema.alterTable('testimonials', table => table.dropColumns('display_order','position','review_title','product_purchased')); };
