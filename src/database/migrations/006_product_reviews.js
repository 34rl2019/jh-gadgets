exports.up = async knex => {
  if (await knex.schema.hasTable('product_reviews')) return;
  await knex.schema.createTable('product_reviews', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('product_id').unsigned().notNullable().references('products.id').onDelete('CASCADE');
    table.string('customer_name', 120).notNullable();
    table.string('customer_email', 190).notNullable();
    table.string('customer_photo', 255).nullable();
    table.integer('rating').unsigned().notNullable();
    table.string('review_title', 180).notNullable();
    table.text('review').notNullable();
    table.string('purchase_reference', 120).nullable();
    table.boolean('purchase_verified').notNullable().defaultTo(false);
    table.boolean('approved').notNullable().defaultTo(false);
    table.boolean('featured').notNullable().defaultTo(false);
    table.enum('status', ['pending', 'approved', 'rejected', 'hidden', 'archived']).notNullable().defaultTo('pending');
    table.timestamps(true, true);
    table.index(['product_id', 'status', 'approved']);
    table.index(['featured', 'approved', 'status']);
    table.index(['customer_email', 'product_id']);
  });
};
exports.down = knex => knex.schema.dropTableIfExists('product_reviews');
