exports.up = async knex => {
  if (await knex.schema.hasTable('product_review_votes')) return;
  await knex.schema.createTable('product_review_votes', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('review_id').unsigned().notNullable().references('product_reviews.id').onDelete('CASCADE');
    table.string('voter_key', 80).notNullable();
    table.timestamps(true, true);
    table.unique(['review_id', 'voter_key']);
  });
};
exports.down = knex => knex.schema.dropTableIfExists('product_review_votes');
