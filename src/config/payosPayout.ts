import { PayOS } from "@payos/node";
import dotenv from "dotenv";

dotenv.config();

const payos = new PayOS({
   clientId: process.env.PAYOS_CLIENT_ID_PAYOUT!,
   apiKey: process.env.PAYOS_API_KEY_PAYOUT!,
   checksumKey: process.env.PAYOS_CHECKSUM_KEY_PAYOUT!,
});

export default payos;
