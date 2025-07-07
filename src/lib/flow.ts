import CryptoJS from 'crypto-js';

const API_KEY = process.env.FLOW_API_KEY;
const SECRET_KEY = process.env.FLOW_SECRET_KEY;
const API_URL = process.env.FLOW_API_URL;

if (!API_KEY || !SECRET_KEY || !API_URL) {
    console.error("Flow API credentials are not set in .env file.");
}

/**
 * Signs the request parameters using HMAC-SHA256.
 * @param params - The request parameters to sign.
 * @returns The generated signature.
 */
function sign(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map(key => `${key}${params[key]}`).join('');
    
    if (!SECRET_KEY) {
        throw new Error("FLOW_SECRET_KEY is not defined.");
    }
    
    return CryptoJS.HmacSHA256(toSign, SECRET_KEY).toString(CryptoJS.enc.Hex);
}

interface CreatePaymentOrderParams {
    commerceOrder: string;
    subject: string;
    currency: string;
    amount: number;
    email: string;
    urlConfirmation: string;
    urlReturn: string;
    paymentMethod?: number;
}

interface FlowPayResponse {
    url: string;
    token: string;
    flowOrder: number;
}

/**
 * Creates a payment order with Flow.
 * @param orderParams - The parameters for the payment order.
 * @returns The response from Flow API.
 */
export async function createPaymentOrder(orderParams: CreatePaymentOrderParams): Promise<FlowPayResponse> {
    if (!API_KEY || !API_URL) {
        throw new Error("Flow API credentials are not properly configured.");
    }

    const params = {
        apiKey: API_KEY,
        ...orderParams
    };

    const signature = sign(params);
    const body = new URLSearchParams({ ...params, s: signature }).toString();

    const response = await fetch(`${API_URL}/payment/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
    });
    
    const jsonResponse = await response.json();

    if (!response.ok || jsonResponse.code) {
        throw new Error(`Flow API Error: ${jsonResponse.message} (Code: ${jsonResponse.code})`);
    }

    return jsonResponse as FlowPayResponse;
}


export interface FlowPaymentStatus {
    flowOrder: number;
    commerceOrder: string;
    requestDate: string;
    status: number; // 1: pending, 2: paid, 3: rejected, 4: voided
    subject: string;
    currency: string;
    amount: number;
    payer: string;
    paymentData: {
        date: string;
        media: string;
        fee: number;
        balance: number;
    }
}


/**
 * Gets the status of a payment from Flow.
 * @param token - The payment token provided by Flow.
 * @returns The payment status details.
 */
export async function getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
    if (!API_KEY || !API_URL) {
        throw new Error("Flow API credentials are not properly configured.");
    }

    const params = {
        apiKey: API_KEY,
        token: token,
    };

    const signature = sign(params);
    const url = new URL(`${API_URL}/payment/getStatus`);
    url.search = new URLSearchParams({ ...params, s: signature }).toString();

    const response = await fetch(url.toString());
    const jsonResponse = await response.json();

    if (!response.ok || jsonResponse.code) {
        throw new Error(`Flow API Error: ${jsonResponse.message} (Code: ${jsonResponse.code})`);
    }

    return jsonResponse as FlowPaymentStatus;
}
