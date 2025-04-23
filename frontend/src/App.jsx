import React, { useRef } from "react";
import { useState } from "react";

// --- Mock Data (Replace with actual data later) ---
const initialSources = [
  // { id: 1, name: "Research Paper A.pdf", type: "pdf" },
];

const initialMessages = [
  {
    id: 1,
    sender: "ai",
    text: "Hello! Upload your sources and ask me anything about them.",
  },
];

// --- Reusable Icon Component (Simple Placeholder) ---
const Icon = ({ type }) => {
  let emoji = "📄"; // Default file icon
  if (type === "pdf") emoji = "📕";
  if (type === "text") emoji = "📝";
  if (type === "doc") emoji = " M icroSoft Document"; // Simple representation
  if (type === "add") emoji = "+";
  if (type === "send") emoji = "➤";
  if (type === "user") emoji = "👤";
  if (type === "ai") emoji = "🤖";
  return <span className="mr-2">{emoji}</span>;
};

// --- Main App Component ---
function App() {
  const [sources, setSources] = useState(initialSources);
  const [messages, setMessages] = useState(initialMessages);
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedSource, setSelectedSource] = useState(null);
  const fileInputRef = useRef(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim()) return; // Don't send empty messages

    const newUserMessage = {
      id: messages.length + 1,
      sender: "user",
      text: currentMessage,
    };

    const response = await fetch("http://localhost:3001/api/retrieve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: currentMessage }),
    });

    const data = await response.json();
    if (data.error) {
      console.log(data.error);
      alert(data.error);
      return;
    }

    // Simulate AI response (replace with actual API call)
    const aiResponse = {
      id: messages.length + 2,
      sender: "ai",
      text: data.answer,
    };

    setMessages([...messages, newUserMessage, aiResponse]);
    setCurrentMessage(""); // Clear the input field
  };

  const handleAddSource = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No File Selected!");
      return;
    }

    for (const file of files) {
      console.log("Uploading File : ", file.name);

      const formData = new FormData();
      formData.append("document", file);

      try {
        const response = await fetch("http://localhost:3001/api/uploadFile", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          console.log("Error with api.");
          return;
        }
        const data = await response.json();
        if (data.message) {
          console.log(data.message);
          const source = {
            id: sources.length + 1,
            name: file.name,
            type: file.name.split(".").pop(),
          };
          setSources([...sources, source]);
        }
        alert("Upload Successfull!");
      } catch (error) {
        console.log("error uploading.", error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 font-sans overflow-hidden">
      {/* --- Sidebar (Sources) --- */}
      <aside className="w-72 bg-gray-800 bg-opacity-50 border-r border-gray-700 flex flex-col p-4 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">My Sources</h2>

        {/* Add Source Button */}
        <button
          onClick={handleAddSource}
          className="w-full flex items-center justify-center px-4 py-2 mb-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
        >
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.txt,.md,.docx"
            multiple
          />
          <Icon type="add" /> Add Source
        </button>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {sources.length === 0 && (
            <p className="text-gray-400 italic">No sources added yet.</p>
          )}
          {sources.map((source) => (
            <div
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={`flex items-center p-2 rounded-md cursor-pointer transition duration-150 ease-in-out ${
                selectedSource === source.id
                  ? "bg-indigo-500 bg-opacity-30"
                  : "hover:bg-gray-700 hover:bg-opacity-50"
              }`}
            >
              <Icon type={source.type} />
              <span className="truncate text-sm flex-1">{source.name}</span>
              {/* Add a delete/options button here if needed */}
              {/* <button className="ml-2 text-gray-400 hover:text-red-500">X</button> */}
            </div>
          ))}
        </div>
        {/* Optional Footer/Settings in Sidebar */}
        <div className="mt-auto pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">NotebookLM Clone UI</p>
        </div>
      </aside>

      {/* --- Main Content Area (Chat) --- */}
      <main className="flex-1 flex flex-col h-full">
        {/* Chat Header (Optional) */}
        <header className="bg-gray-800 bg-opacity-70 p-4 border-b border-gray-700 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-200">
            Chat with your Sources
          </h1>
          {/* Add other controls like 'New Chat' if needed */}
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-lg lg:max-w-xl xl:max-w-2xl shadow ${
                  message.sender === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                <div className="flex items-start space-x-2 mb-1">
                  <Icon type={message.sender} />
                  <span className="font-medium text-sm capitalize">
                    {message.sender}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{message.text}</p>
                {/* Optionally add timestamp or source references here */}
              </div>
            </div>
          ))}
          {/* Add a placeholder for when the AI is thinking */}
          {/* <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700 text-gray-400 italic">AI is thinking...</div></div> */}
        </div>

        {/* Chat Input Area */}
        <footer className="p-4 border-t border-gray-700 bg-gray-800 bg-opacity-70">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-3"
          >
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask something about your sources..."
              className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-100 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!currentMessage.trim()}
              className={`p-3 rounded-lg transition duration-150 ease-in-out flex items-center justify-center ${
                currentMessage.trim()
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Icon type="send" />
              <span className="sr-only">Send</span> {/* Screen reader text */}
            </button>
          </form>
        </footer>
      </main>

      {/* Optional Third Panel (Notes / Synthesis Area) */}
      {/*
      <aside className="w-80 bg-gray-800 bg-opacity-30 border-l border-gray-700 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">My Notes</h2>
        <textarea
          className="w-full h-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-100"
          placeholder="Synthesize your findings here..."
        ></textarea>
      </aside>
      */}
    </div>
  );
}

export default App;
