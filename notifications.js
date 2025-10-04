// This file contains all shared notification logic for the application.

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

async function sendNotification(title, message) {
    // This function requires 'currentUser' to be a global variable on the page that includes this script.
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: message, icon: "https://cdn-icons-png.flaticon.com/512/992/992700.png" });
    }
    if (typeof currentUser !== 'undefined' && currentUser) {
        const newNote = {
            user_id: currentUser.id,
            title,
            message,
            seen: false
        };
        // This function requires 'supabase' to be a global variable.
        const { error } = await supabase.from('notifications').insert(newNote);
        if (error) console.error("Error saving notification:", error);
    }
}

// This is the final version of the checkDueTasks function for your workaround.
async function checkDueTasks() {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        return; // If no user is logged in, do nothing.
    }
    const currentUser = session.user;

    const now = new Date();
    // Select all necessary columns, including the new 'emailnotified1hr' and original 'notifieddue'
    const { data: allPendingTasks, error: fetchError } = await supabase.from('tasks')
        .select('id, name, due_datetime, notified1hr, emailnotified1hr, notifieddue')
        .eq('user_id', currentUser.id)
        .eq('completed', false);

    if (fetchError || !allPendingTasks) { return; }

    // --- 1. Logic for 1-hour notifications (Browser + Email) ---
    const tasksToNotify1hr = allPendingTasks.filter(task => {
        if (!task.due_datetime || task.notified1hr || task.emailnotified1hr) return false;
        const diffMinutes = Math.round((new Date(task.due_datetime) - now) / 60000);
        return diffMinutes > 0 && diffMinutes <= 60;
    });

    if (tasksToNotify1hr.length > 0) {
        console.log(`Found ${tasksToNotify1hr.length} task(s) for 1-hour notification.`);
        const taskIds = tasksToNotify1hr.map(t => t.id);
        
        // Update both flags at once to prevent duplicates
        const { error: updateError } = await supabase.from('tasks')
            .update({ notified1hr: true, emailnotified1hr: true })
            .in('id', taskIds);

        if (updateError) {
            console.error("Error updating 1-hour notification flags:", updateError);
        } else {
            tasksToNotify1hr.forEach(async (task) => {
                // Send Browser Notification
                sendNotification("⏳ Upcoming Task", `${task.name} is due in about an hour!`);
                // Invoke Edge Function for Email
                try {
                    await supabase.functions.invoke('send-due-task-email', {
                        body: { taskName: task.name, userEmail: currentUser.email }
                    });
                    console.log(`Successfully invoked email function for: ${task.name}`);
                } catch (e) {
                    console.error('Error invoking email function:', e.message);
                }
            });
        }
    }

    // --- 2. Logic for tasks that are due right now (Browser Only) ---
    const tasksToNotifyNow = allPendingTasks.filter(task => {
        if (!task.due_datetime || task.notifieddue) return false;
        const diffMinutes = Math.round((new Date(task.due_datetime) - now) / 60000);
        // Triggers if the task became due in the last 2 minutes
        return diffMinutes <= 0 && diffMinutes > -2;
    });

    if (tasksToNotifyNow.length > 0) {
        console.log(`Found ${tasksToNotifyNow.length} task(s) due now.`);
        const taskIds = tasksToNotifyNow.map(t => t.id);

        const { error: updateError } = await supabase.from('tasks')
            .update({ notifieddue: true })
            .in('id', taskIds);

        if (!updateError) {
            tasksToNotifyNow.forEach(task => {
                sendNotification("⚡ Task Due Now", `${task.name} is due right now!`);
            });
        }
    }
}