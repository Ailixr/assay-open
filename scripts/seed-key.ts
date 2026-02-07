import "./load-env";
import { createApiKey } from "../src/lib/auth/middleware";

async function seed() {
  const { key, prefix } = await createApiKey("smallworld_dev", "development");
  console.log("\n🔑 API Key Created");
  console.log(`   Key:    ${key}`);
  console.log(`   Prefix: ${prefix}`);
  console.log(`   Provider: smallworld_dev`);
  console.log("\n⚠️  Save this key now. It cannot be retrieved again.\n");
}

seed().catch(console.error);
