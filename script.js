$(document).ready(function () {
    const connections = []; // Store connections between nodes
    let selectedNodes = []; // Store selected nodes for connections

    // Add a task
    $("#add-task-button").click(function () {
        addTask();
    });

    $("#new-task-input").keypress(function (e) {
        if (e.key === "Enter") {
            addTask();
        }
    });

    function addTask() {
        const taskTitle = $("#new-task-input").val().trim();
        if (taskTitle) {
            const sanitizedTitle = taskTitle.replace(/[^a-zA-Z0-9]/g, "-");
            const taskItem = $(`
                <li class="task">
                    <span>${taskTitle}</span>
                    <div class="task-actions">
                        <button class="icon-button done" title="Mark Complete">✔️</button>
                        <button class="icon-button delete" title="Delete Task">❌</button>
                    </div>
                </li>
            `);

            // Make the task draggable
            taskItem.draggable({
                helper: "clone",
                revert: "invalid",
            });

            $("#task-list").append(taskItem);
            $("#new-task-input").val("");
        }
    }

    // Handle task completion and deletion
    $("#task-list").on("click", ".done", function () {
        const taskItem = $(this).closest(".task");
        const taskTitle = taskItem.find("span").text().trim();
        const sanitizedTitle = taskTitle.replace(/[^a-zA-Z0-9]/g, "-");

        taskItem.toggleClass("done");
        $(`#mind-map #${sanitizedTitle}`).toggleClass("grayed-out");
    });

    $("#task-list").on("click", ".delete", function () {
        const taskItem = $(this).closest(".task");
        const taskTitle = taskItem.find("span").text().trim();
        const sanitizedTitle = taskTitle.replace(/[^a-zA-Z0-9]/g, "-");

        taskItem.remove();
        removeNodeAndConnections(sanitizedTitle);
    });

    // Make the mind map droppable
    $("#mind-map").droppable({
        accept: ".task",
        drop: function (event, ui) {
            const taskTitle = ui.helper.find("span").text();
            const sanitizedTitle = taskTitle.replace(/[^a-zA-Z0-9]/g, "-");

            if ($(`#mind-map #${sanitizedTitle}`).length === 0) {
                const taskNode = $(`
                    <div class="task-node" id="${sanitizedTitle}">
                        ${taskTitle}
                    </div>
                `);

                taskNode.draggable({
                    containment: "#mind-map",
                    drag: function () {
                        updateConnections($(this));
                    },
                });

                taskNode.click(function () {
                    handleNodeSelection($(this));
                });

                $(this).append(taskNode);

                // Dynamically adjust the bubble width
                adjustBubbleWidth(taskNode);

                taskNode.css({
                    top: ui.offset.top - $(this).offset().top,
                    left: ui.offset.left - $(this).offset().left,
                });
            }
        },
    });

    // Adjust bubble width dynamically based on content size
    function adjustBubbleWidth(taskNode) {
        const textSpan = $("<span>").text(taskNode.text()).css({
            visibility: "hidden",
            position: "absolute",
            whiteSpace: "nowrap",
            fontSize: "inherit",
        });
        $("body").append(textSpan);
        const textWidth = textSpan[0].scrollWidth; // Calculate the actual width of the text
        taskNode.css("width", `${textWidth + 20}px`); // Add padding for better spacing
        textSpan.remove();
    }

    // Handle node selection and connection
    function handleNodeSelection(node) {
        if (selectedNodes.length < 2) {
            node.addClass("selected");
            selectedNodes.push(node);
        }

        if (selectedNodes.length === 2) {
            drawLine(selectedNodes[0], selectedNodes[1]);
            selectedNodes.forEach((n) => n.removeClass("selected"));
            selectedNodes = [];
        }
    }

    function drawLine(node1, node2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        const pos1 = node1.position();
        const pos2 = node2.position();

        const centerX1 = pos1.left + node1.width() / 2;
        const centerY1 = pos1.top + node1.height() / 2;
        const centerX2 = pos2.left + node2.width() / 2;
        const centerY2 = pos2.top + node2.height() / 2;

        line.setAttribute("x1", centerX1);
        line.setAttribute("y1", centerY1);
        line.setAttribute("x2", centerX2);
        line.setAttribute("y2", centerY2);

        line.setAttribute("stroke", getRandomColor());
        $("#connections").append(line);

        connections.push({
            from: node1.attr("id"),
            to: node2.attr("id"),
            line,
        });
    }

    function updateConnections(node) {
        const nodeId = node.attr("id");
        connections.forEach((connection) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                const line = connection.line;
                const fromNode = $(`#${connection.from}`);
                const toNode = $(`#${connection.to}`);

                const pos1 = fromNode.position();
                const pos2 = toNode.position();

                const centerX1 = pos1.left + fromNode.width() / 2;
                const centerY1 = pos1.top + fromNode.height() / 2;
                const centerX2 = pos2.left + toNode.width() / 2;
                const centerY2 = pos2.top + toNode.height() / 2;

                line.setAttribute("x1", centerX1);
                line.setAttribute("y1", centerY1);
                line.setAttribute("x2", centerX2);
                line.setAttribute("y2", centerY2);
            }
        });
    }

    function removeNodeAndConnections(nodeId) {
        $(`#${nodeId}`).remove();
        connections
            .filter((connection) => connection.from === nodeId || connection.to === nodeId)
            .forEach((connection) => $(connection.line).remove());

        connections = connections.filter(
            (connection) => connection.from !== nodeId && connection.to !== nodeId
        );
    }

    // Export tasks and mind map data to a JSON file
    $("#export-button").click(function () {
        const tasks = [];
        $("#task-list .task").each(function () {
            const taskText = $(this).find("span").text();
            tasks.push(taskText);
        });

        const nodes = [];
        $("#mind-map .task-node").each(function () {
            const id = $(this).attr("id");
            const text = $(this).text();
            const position = $(this).position();
            const isGrayedOut = $(this).hasClass("grayed-out");
            const width = $(this).width();
            nodes.push({ id, text, top: position.top, left: position.left, isGrayedOut, width });
        });

        const data = {
            tasks,
            nodes,
            connections: connections.map((connection) => ({
                from: connection.from,
                to: connection.to,
            })),
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "mindmap-data.json";
        a.click();

        URL.revokeObjectURL(url);
    });

    // Import tasks and mind map data from a JSON file
    $("#import-button").click(function () {
        $("#import-input").click();
    });

    $("#import-input").change(function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = JSON.parse(e.target.result);
                restoreData(data);
            };
            reader.readAsText(file);
        }
    });

    function restoreData(data) {
        // Clear existing tasks and mind map
        $("#task-list").empty();
        $("#mind-map .task-node").remove();
        $("#connections").empty();
        connections.length = 0;

        // Restore tasks
        data.tasks.forEach((task) => {
            const taskItem = $(`
                <li class="task">
                    <span>${task}</span>
                    <div class="task-actions">
                        <button class="icon-button done" title="Mark Complete">✔️</button>
                        <button class="icon-button delete" title="Delete Task">❌</button>
                    </div>
                </li>
            `);
            taskItem.draggable({
                helper: "clone",
                revert: "invalid",
            });
            $("#task-list").append(taskItem);
        });

        // Restore nodes
        data.nodes.forEach((node) => {
            const taskNode = $(`
                <div class="task-node" id="${node.id}">
                    ${node.text}
                </div>
            `);

            taskNode.css({
                top: node.top + "px",
                left: node.left + "px",
                width: `${node.width}px`,
            });
            if (node.isGrayedOut) {
                taskNode.addClass("grayed-out");
            }

            taskNode.draggable({
                containment: "#mind-map",
                drag: function () {
                    updateConnections($(this));
                },
            });

            taskNode.click(function () {
                handleNodeSelection($(this));
            });

            $("#mind-map").append(taskNode);
        });

        // Restore connections
        data.connections.forEach((connection) => {
            const fromNode = $(`#${connection.from}`);
            const toNode = $(`#${connection.to}`);
            drawLine(fromNode, toNode);
        });
    }

    function getRandomColor() {
        const letters = "0123456789ABCDEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
});
