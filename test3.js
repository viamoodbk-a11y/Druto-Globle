async function run() {
  const q = `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'scratch_card_configs' AND constraint_type = 'UNIQUE';`;
  // I can't query this through REST directly without RPC
}
