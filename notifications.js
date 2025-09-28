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

async function checkDueTasks() {
    if (typeof currentUser === 'undefined' || !currentUser) { return; }

    const now = new Date();
    const { data: allPendingTasks, error: fetchError } = await supabase.from('tasks')
        .select('id, name, due_datetime, notified1hr, notifieddue')
        .eq('user_id', currentUser.id)
        .eq('completed', false);

    if (fetchError || !allPendingTasks) { return; }

    // --- LOGIC UPDATED HERE ---
    const tasksToNotifyNow = allPendingTasks.filter(task => {
        if (!task.due_datetime || task.notifieddue) return false;
        const diffMinutes = Math.round((new Date(task.due_datetime) - now) / 60000);
        // ONLY trigger if the task became due in the last 2 minutes.
        // This creates a small window and prevents repeat notifications.
        return diffMinutes <= 0 && diffMinutes > -2; 
    });

    const tasksToNotify1hr = allPendingTasks.filter(task => {
        if (!task.due_datetime || task.notified1hr) return false;
        const diffMinutes = Math.round((new Date(task.due_datetime) - now) / 60000);
        return diffMinutes > 0 && diffMinutes <= 60;
    });

    if (tasksToNotifyNow.length > 0) {
        const taskIds = tasksToNotifyNow.map(t => t.id);
        const { error } = await supabase.from('tasks').update({ notifieddue: true }).in('id', taskIds);
        if (!error) {
            tasksToNotifyNow.forEach(task => {
                sendNotification("⚡ Task Due Now", `${task.name} is due right now!`);
            });
        }
    }

    if (tasksToNotify1hr.length > 0) {
        const taskIds = tasksToNotify1hr.map(t => t.id);
        const { error } = await supabase.from('tasks').update({ notified1hr: true }).in('id', taskIds);
        if (!error) {
            tasksToNotify1hr.forEach(task => {
                sendNotification("⏳ Upcoming Task", `${task.name} is due in about an hour!`);
            });
        }
    }
}