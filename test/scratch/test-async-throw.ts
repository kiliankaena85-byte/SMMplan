async function sendWelcomeLetter(email: string) {
  throw new Error("Welcome Letter Sync Throw");
}

async function runTest() {
  Promise.resolve().then(async () => {
    try {
      if (true) {
        sendWelcomeLetter("test@example.com").catch(console.error);
      }
    } catch (e) {
      console.log("Caught:", e);
    }
  });
}

runTest();
export {};
