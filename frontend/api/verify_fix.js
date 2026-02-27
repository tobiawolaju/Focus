const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;
const USER_ID = 'test-user-verification';

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runVerification() {
    console.log("Starting verification...");

    try {
        // 1. Initial Status Check
        console.log("\n1. Checking initial status...");
        let data = await request('/check-futures-status', 'POST', { userId: USER_ID });
        const initialHash = data.currentHash;
        console.log(`Initial Hash: ${initialHash}`);

        // 2. Add Activity
        console.log("\n2. Adding a test activity...");
        await request('/chat', 'POST', {
            message: "Test activity at 10am",
            userId: USER_ID,
            accessToken: "mock-token",
            timeZone: "UTC"
        });

        // Check Status after Add
        data = await request('/check-futures-status', 'POST', { userId: USER_ID });
        const afterAddHash = data.currentHash;
        console.log(`Hash after Add: ${afterAddHash}`);

        if (initialHash === afterAddHash && initialHash !== undefined) {
            console.log("NOTE: Hash same (first activity?). Accessing fresh hash.");
        } else {
            console.log("SUCCESS: Hash changed after add.");
        }

        // 3. Update Activity Time
        console.log("\n3. Updating activity time (via chat)...");
        const updateRes = await request('/chat', 'POST', {
            message: "update Test activity time to 11am",
            userId: USER_ID,
            accessToken: "mock-token",
            timeZone: "UTC"
        });
        console.log("Update response:", updateRes.reply);

        // Check Status after Update
        data = await request('/check-futures-status', 'POST', { userId: USER_ID });
        const afterUpdateHash = data.currentHash;
        console.log(`Hash after Update: ${afterUpdateHash}`);

        if (afterAddHash === afterUpdateHash) {
            console.error("FAILURE: Hash did NOT change after updating time! Bug still exists.");
        } else {
            console.log("SUCCESS: Hash changed after updating time! Fix verified.");
        }

        // 4. Cleanup (Delete)
        console.log("\n4. Cleaning up (Deleting activity)...");
        await request('/chat', 'POST', {
            message: "delete Test activity",
            userId: USER_ID,
            accessToken: "mock-token",
            timeZone: "UTC"
        });

        // Final Status Check
        data = await request('/check-futures-status', 'POST', { userId: USER_ID });
        const finalHash = data.currentHash;
        console.log(`Final Hash: ${finalHash}`);

    } catch (err) {
        console.error("Verification failed:", err.message);
        console.error("Ensure the backend server is running on localhost:3000");
    }
}

runVerification();
