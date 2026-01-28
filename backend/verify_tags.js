const tools = require('./tools');
const { db, firebaseReady } = require('./firebase-config');

async function test() {
    // Wait a bit for connection if needed, though usually init is sync-ish for admin
    if (!firebaseReady) {
        // Try waiting a second
        await new Promise(r => setTimeout(r, 1000));
        if (!require('./firebase-config').firebaseReady) {
            console.error("Firebase not ready (check serviceAccountKey.json)");
            process.exit(1);
        }
    }

    const testUid = "TEST_USER_TAGS_VERIFY";
    const context = { uid: testUid };

    console.log("1. Adding activity...");
    const addRes = await tools.addActivity({
        title: "Test Tag Activity",
        startTime: "10:00",
        endTime: "11:00",
        tags: ["initial"]
    }, context);

    if (!addRes.success) {
        console.error("Add failed:", addRes);
        process.exit(1);
    }
    const id = addRes.activity.id;
    console.log("Added ID:", id);

    console.log("2. Updating tags...");
    const updateRes = await tools.updateActivity({
        id: id,
        tags: ["updated", "working"]
    }, context);

    if (!updateRes.success) {
        console.error("Update failed:", updateRes);
        process.exit(1);
    }

    console.log("3. Verifying storage...");
    const schedule = await tools.getSchedule({}, context);
    const item = schedule.find(a => a.id == id);

    console.log("Retrieved item tags:", item.tags);

    if (Array.isArray(item.tags) && item.tags.includes("working")) {
        console.log("SUCCESS: Tags updated correctly.");
    } else {
        console.error("FAILURE: Tags incorrect.", item.tags);
    }

    // Cleanup
    console.log("4. Cleaning up...");
    await tools.deleteActivity({ id }, context);
    console.log("Done.");
    process.exit(0);
}

test().catch(err => {
    console.error("Test crashed:", err);
    process.exit(1);
});
