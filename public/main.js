document.documentElement.dataset.supported = ("streamAppendHTMLUnsafe" in document.body);

const worker = new Worker("/worker.js", { type: "module" });
function patch_navigation(url) {
    document.documentElement.dataset.navState = "pending";
    const stream = document.body.streamAppendHTMLUnsafe();
    const { port1, port2 } = new MessageChannel();
    worker.postMessage({ url, stream, port: port1 }, [stream, port1]);
    const committed = Promise.withResolvers();
    const finished = Promise.withResolvers();
    port2.addEventListener("message", e => {
        switch (e.data) {
            case "commit":
                document.documentElement.dataset.navState = "committed";
                committed.resolve();
                break;
            case "finish":
                document.documentElement.dataset.navState = "finished";
                finished.resolve();
                break;
            default:
                break;
        }
    });
    port2.start();
    return { committed, finished }
}

worker.addEventListener("message", async () => {
    await patch_navigation(location.href).finished;

    document.addEventListener("scrollsnapchange", e => {
        e.snapTargetInline.querySelector(".snap-to-activate")?.click();
    }, { capture: true });

    window.navigation.addEventListener("navigate", e => {
        if (!e.canIntercept)
            return;
        e.intercept({
            async precommitHandler(controller) {
                const transition_type = e.sourceElement?.classList?.contains("snap-to-activate") ? "instant" : "default";
                const navigation_finished = Promise.withResolvers();
                const transition = document.startViewTransition({
                    update: () => {
                        console.log("VT", e.destination.url);
                        const { committed, finished } = patch_navigation(e.destination.url);
                        finished.promise.then(() => navigation_finished.resolve());
                        return committed.promise;
                    },
                    types: [transition_type]
                });
                controller.addHandler(() => Promise.all([transition.finished, navigation_finished.promise]));
                return transition.updateCallbackDone;
            }
        });
    });
}, { once: true });

