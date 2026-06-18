import { Type, FunctionDeclaration } from '@google/genai'

export const systemToolDeclarations: FunctionDeclaration[] = [
  {
    name: 'index_Folder',
    description:
      "ACTION: Reads a specific folder and memorizes its files into the local Vector Database. Run this when the user asks you to 'memorize', 'index', or 'read' a project folder but remember not a Directory. so you can semantically search it later.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        folder_path: {
          type: Type.STRING,
          description: 'The absolute path of the folder to index.'
        }
      },
      required: ['folder_path']
    }
  },
  {
    name: 'smart_file_search',
    description:
      "ACTION: Performs an ultra-fast, deep file search across the user's entire system. It natively handles nested folders and specific locations. Just pass the user's natural language request. only use for Files.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "The exact natural language request. E.g., 'find my resume in documents folder 1' or 'find the invoice from onedrive'."
        }
      },
      required: ['query']
    }
  },
  {
    name: 'read_file',
    description: 'Read the text content of a file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: 'The absolute path to the file.' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'write_file',
    description: 'Write text to a file (creates or overwrites).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_name: {
          type: Type.STRING,
          description: 'File name (e.g. notes.txt) or full path.'
        },
        content: { type: Type.STRING, description: 'The text content to write.' }
      },
      required: ['file_name', 'content']
    }
  },
  {
    name: 'manage_file',
    description: 'Manage files: Copy, Move (Cut/Paste), or Delete them.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: {
          type: Type.STRING,
          enum: ['copy', 'move', 'delete'],
          description: 'The action to perform.'
        },
        source_path: { type: Type.STRING, description: 'The file to act on.' },
        dest_path: {
          type: Type.STRING,
          description: 'Destination path (Required for copy/move, ignore for delete).'
        }
      },
      required: ['operation', 'source_path']
    }
  },
  {
    name: 'open_file',
    description:
      'Open a file in its default system application (e.g., VS Code for code, Media Player for video). Use this after creating a file or when the user asks to see something.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: 'The absolute path to the file.' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'read_directory',
    description:
      'Scan a directory (folder) to see what files are inside. Use this to check contents of "Desktop", "Downloads", etc. Returns a list of files with metadata (name, type, size). remember the Keyword "load Directory"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        directory_path: {
          type: Type.STRING,
          description: 'The folder path (e.g. "Desktop", "Documents", "C:/Projects").'
        }
      },
      required: ['directory_path']
    }
  },
  {
    name: 'open_app',
    description:
      'Launch a system application or software installed on the computer (e.g., VS Code, Chrome, WhatsApp, Calculator, Settings).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: {
          type: Type.STRING,
          description: 'The name of the application (e.g., "vscode", "whatsapp", "browser").'
        }
      },
      required: ['app_name']
    }
  },
  {
    name: 'save_note',
    description:
      'Save a plan, idea, or code snippet into the system notes. Use this when the user says "Remember this", "Save this plan", or "Create a note".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'A short, descriptive title for the note (e.g., "Project_Iris_Plan").'
        },
        content: {
          type: Type.STRING,
          description:
            'The full content of the note in Markdown format. Use headers, bullet points, and code blocks.'
        }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'read_notes',
    description:
      'Load and read previously saved notes from the system memory. Use this when the user asks to "remember notes", "load notes", or "what was the plan?".',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'google_search',
    description:
      "ACTION: Opens a web browser tab. Use this ONLY when the user explicitly says 'open google', 'search for X in the browser', or just wants a quick link opened. DO NOT use this for deep research, generating reports, or learning new data.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query.' }
      },
      required: ['query']
    }
  },
  {
    name: 'close_app',
    description:
      'Force close or terminate a running application. Use this when the user says "Close [App]", "Kill [App]", or "Stop [App]".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: {
          type: Type.STRING,
          description: 'The name of the application to close (e.g., "Chrome", "Notepad").'
        }
      },
      required: ['app_name']
    }
  },
  {
    name: 'ghost_type',
    description:
      'Type text using the keyboard. Use this for simple typing requests like "Type hello".',
    parameters: {
      type: Type.OBJECT,
      properties: { text: { type: Type.STRING } },
      required: ['text']
    }
  },
  {
    name: 'execute_sequence',
    description:
      'Run complex automation. Requires a JSON string array of actions (wait, type, press).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        json_actions: { type: Type.STRING }
      },
      required: ['json_actions']
    }
  },
  {
    name: 'send_whatsapp',
    description:
      'Send a WhatsApp message immediately. If the user wants to send a file, provide the file_path.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Contact Name exactly as saved.' },
        message: { type: Type.STRING, description: 'The message text or file caption.' },
        file_path: {
          type: Type.STRING,
          description: 'Optional: Full absolute path to the file to attach.'
        }
      },
      required: ['name', 'message']
    }
  },
  {
    name: 'schedule_whatsapp',
    description: 'Schedule a WhatsApp message to be sent later.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        message: { type: Type.STRING },
        delay_minutes: {
          type: Type.NUMBER,
          description: 'Time in minutes to wait before sending.'
        },
        file_path: {
          type: Type.STRING,
          description: 'Optional: Full absolute path to the file.'
        }
      },
      required: ['name', 'message', 'delay_minutes']
    }
  },
  {
    name: 'play_spotify_music',
    description: 'Search for and instantly play a specific song, artist, or playlist on Spotify.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        song_name: {
          type: Type.STRING,
          description: 'The name of the song and artist to play (e.g., "Starboy by The Weeknd").'
        }
      },
      required: ['song_name']
    }
  },
  {
    name: 'set_volume',
    description: 'Set system volume (0-100).',
    parameters: {
      type: Type.OBJECT,
      properties: { level: { type: Type.NUMBER } },
      required: ['level']
    }
  },
  {
    name: 'take_screenshot',
    description: 'Take a screenshot.',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },

  {
    name: 'click_on_screen',
    description: 'Click on a specific UI element on the screen based on its description.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: {
          type: Type.STRING,
          description: 'What to click? (e.g. "The Play button", "The search bar")'
        },
        x: {
          type: Type.NUMBER,
          description: 'The X coordinate (0-1000 scale) of the center of the object.'
        },
        y: {
          type: Type.NUMBER,
          description: 'The Y coordinate (0-1000 scale) of the center of the object.'
        }
      },
      required: ['description', 'x', 'y']
    }
  },
  {
    name: 'scroll_screen',
    description: 'Scroll up or down.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        direction: { type: Type.STRING, enum: ['up', 'down'] },
        amount: { type: Type.NUMBER }
      },
      required: ['direction']
    }
  },
  {
    name: 'press_shortcut',
    description: 'Press keyboard shortcut (e.g. Ctrl+W).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING },
        modifiers: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['key', 'modifiers']
    }
  },
  {
    name: 'activate_protocol',
    description: 'Activates a complex workflow mode (like Coding Mode).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        protocol_name: {
          type: Type.STRING,
          enum: ['coding'],
          description: 'The mode to start (e.g., "coding").'
        }
      },
      required: ['protocol_name']
    }
  },
  {
    name: 'run_terminal',
    description: 'Run a shell command (npm install, git status, etc).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: 'Command to run.' },
        path: { type: Type.STRING, description: 'Folder path to run it in.' }
      },
      required: ['command']
    }
  },
  {
    name: 'create_folder',
    description: 'Create a new folder.',
    parameters: {
      type: Type.OBJECT,
      properties: { folder_path: { type: Type.STRING } },
      required: ['folder_path']
    }
  },
  {
    name: 'open_project',
    description: 'Open a folder in VS Code.',
    parameters: {
      type: Type.OBJECT,
      properties: { folder_path: { type: Type.STRING } },
      required: ['folder_path']
    }
  },
  {
    name: 'open_map',
    description: 'Open a real, interactive dark-mode map for a specific city or location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'The city or place name (e.g. "Tokyo").'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'get_navigation',
    description: 'Get driving directions and a visual route between two cities.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING, description: 'Start location (e.g. "Delhi").' },
        destination: { type: Type.STRING, description: 'End location (e.g. "Mumbai").' }
      },
      required: ['origin', 'destination']
    }
  },
  {
    name: 'generate_image',
    description: 'Generate a high-quality image using AI based on a text prompt.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description:
            'A detailed description of the image to generate (e.g. "Cyberpunk city with neon rain").'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'read_gallery',
    description:
      'Get a list of all saved AI images in the Gallery with their exact file paths. Use this first to find the path of an image before sending it to WhatsApp or analyzing it.',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'analyze_direct_photo',
    description:
      'Use this tool to physically look at a specific photo from the gallery. Requires the exact file_path. Once you call this, the image will be sent to your vision processing and you can describe it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: {
          type: Type.STRING,
          description: 'The absolute file path of the image.'
        }
      },
      required: ['file_path']
    }
  },
  {
    name: 'read_emails',
    description:
      'Read the latest unread emails from the user\'s Gmail inbox. Use this when the user asks "check my emails" or "do I have any new emails?".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: {
          type: Type.NUMBER,
          description: 'Number of emails to fetch (default is 5).'
        }
      },
      required: []
    }
  },
  {
    name: 'send_email',
    description:
      'Send an email to a specific email address. Only use this if the user explicitly says to SEND it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: 'The recipient email address.' },
        subject: { type: Type.STRING, description: 'The subject of the email.' },
        body: { type: Type.STRING, description: 'The main message content.' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'draft_email',
    description:
      'Create an email draft but do NOT send it. Use this if the user asks you to "draft a reply" or "write an email" but doesn\'t say to send it immediately.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: 'The recipient email address.' },
        subject: { type: Type.STRING, description: 'The subject of the email.' },
        body: { type: Type.STRING, description: 'The main message content.' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'get_weather',
    description:
      'Get the current real-time weather, temperature, and atmospheric conditions for a specific city or location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'The name of the city (e.g., "New York", "London", "Aligarh").'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'get_stock_price',
    description:
      'Get the real-time stock price and today\'s interactive chart for a specific company ticker. IMPORTANT: For Indian stocks (like Tata, Jio, Reliance), you MUST append ".NS" (e.g., "TATAMOTORS.NS", "JIOFIN.NS", "RELIANCE.NS"). For US stocks, use standard tickers (e.g., "TTWO", "AAPL").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticker: { type: Type.STRING, description: 'The official stock ticker symbol.' }
      },
      required: ['ticker']
    }
  },
  {
    name: 'compare_stocks',
    description:
      'Compare the real-time intraday stock prices and charts of TWO companies simultaneously. Remember to append ".NS" for Indian stocks (e.g., "JIOFIN.NS" and "TATAMOTORS.NS").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticker1: { type: Type.STRING, description: 'The first stock ticker symbol.' },
        ticker2: { type: Type.STRING, description: 'The second stock ticker symbol.' }
      },
      required: ['ticker1', 'ticker2']
    }
  },
  {
    name: 'open_mobile_app',
    description:
      'Launch an app on the user\'s connected Android phone. YOU MUST CONVERT the app name into its official Android package name (e.g., if the user says "WhatsApp", output "com.whatsapp". For "Instagram", output "com.instagram.android"). If they ask for the Camera, output "android.media.action.STILL_IMAGE_CAMERA".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        package_name: {
          type: Type.STRING,
          description: 'The exact Android package name to launch.'
        }
      },
      required: ['package_name']
    }
  },
  {
    name: 'close_mobile_app',
    description:
      'Close, kill, or force-stop an app on the user\'s connected Android phone. YOU MUST CONVERT the app name into its official Android package name (e.g., "com.whatsapp").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        package_name: {
          type: Type.STRING,
          description: 'The exact Android package name to close or force-stop.'
        }
      },
      required: ['package_name']
    }
  },
  {
    name: 'tap_mobile_screen',
    description:
      'Tap or click on a specific visual element on the connected Android phone. If the user attaches an image and says "Click the red button" or "Tap the plus icon", visually analyze the image. Estimate the exact X and Y coordinates of that object as a PERCENTAGE from 0 to 100. (e.g., Top-Left is X:0 Y:0, Bottom-Right is X:100 Y:100, Dead Center is X:50 Y:50).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        x_percent: {
          type: Type.NUMBER,
          description: 'The X coordinate percentage (0-100) from left to right.'
        },
        y_percent: {
          type: Type.NUMBER,
          description: 'The Y coordinate percentage (0-100) from top to bottom.'
        }
      },
      required: ['x_percent', 'y_percent']
    }
  },
  {
    name: 'swipe_mobile_screen',
    description:
      'Swipe or scroll the mobile device screen. Use this if the user says "Scroll down", "Swipe left", "Go next page", etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        direction: {
          type: Type.STRING,
          description:
            'The direction to swipe. ONLY use: "up", "down", "left", or "right". (Note: Swiping "up" means scrolling down the page).'
        }
      },
      required: ['direction']
    }
  },
  {
    name: 'get_mobile_info',
    description:
      'Get the real-time battery and hardware telemetry of the user\'s connected Android mobile device. Use this if the user asks "How is my phone doing?" or "What is my mobile battery?".',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_mobile_notifications',
    description:
      'Read the latest incoming notifications, messages, and alerts from the user\'s connected Android phone. Use this when the user says "Read my notifications", "Do I have any messages?", "Check my phone alerts", or "Did anyone text me?".',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'push_file_to_mobile',
    description:
      'Send (push) a file from the user\'s PC to their connected Android mobile device. Use this if the user says "Send this file to my phone" or "Push the photo to my mobile".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        source_path: {
          type: Type.STRING,
          description:
            'The absolute file path on the PC (e.g., "C:/Users/Harsh/Desktop/document.pdf").'
        },
        dest_path: {
          type: Type.STRING,
          description:
            'Optional. The destination path on the phone. Leave empty to default to "/sdcard/Download/".'
        }
      },
      required: ['source_path']
    }
  },
  {
    name: 'pull_file_from_mobile',
    description:
      'Retrieve (pull) a file from the user\'s connected Android phone and save it to their PC. Use this if the user says "Get the latest photo from my phone" or "Pull the file from my mobile".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        source_path: {
          type: Type.STRING,
          description:
            'The absolute file path on the Android phone (e.g., "/sdcard/DCIM/Camera/photo.jpg").'
        },
        dest_path: {
          type: Type.STRING,
          description:
            "Optional. The destination folder on the PC. Leave empty to default to the PC's Downloads folder."
        }
      },
      required: ['source_path']
    }
  },
  {
    name: 'toggle_mobile_hardware',
    description:
      'Turn system hardware settings ON or OFF on the connected Android phone. Supported settings include: "wifi", "bluetooth", "data", "airplane", "location", "flashlight". WARNING: If the user asks to turn OFF Wi-Fi, you MUST warn them first saying "Bhai, if I turn off Wi-Fi, our wireless connection will break instantly. Are you sure?" Proceed only if they confirm.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: {
          type: Type.STRING,
          description:
            'The name of the setting to toggle (e.g., "wifi", "bluetooth", "location", "airplane", "flashlight"). Extract this from the user\'s command.'
        },
        state: {
          type: Type.BOOLEAN,
          description: 'Pass true to turn ON, false to turn OFF.'
        }
      },
      required: ['setting', 'state']
    }
  },
  {
    name: 'hack_live_website',
    description:
      'Visually hack and mutate any live website on the internet. This will open the target URL and inject custom JavaScript to alter its appearance and text. Use this when the user says "Hack Apple" or "Make Wikipedia look like my terminal".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description:
            'The full URL of the target website (e.g., "https://www.apple.com"). Guess the URL if the user just gives a brand name.'
        },
        mode: {
          type: Type.STRING,
          enum: ['emerald_theme', 'rewrite', 'both'],
          description:
            'Choose "emerald_theme" to inject the neon green UI, "rewrite" to change text, or "both".'
        },
        custom_text: {
          type: Type.STRING,
          description:
            'If rewriting text, generate a highly cinematic, hacker-style headline to inject into the website. (e.g., "IRIS HAS TAKEN OVER", or whatever the user requested).'
        }
      },
      required: ['url', 'mode']
    }
  },
  {
    name: 'build_file',
    description:
      'Writes code and saves it to a specific file. Use this when the user asks you to create a script, write a component, or code a file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_name: {
          type: Type.STRING,
          description: 'Name of the file with extension (e.g., auth.ts, server.py)'
        },
        prompt: {
          type: Type.STRING,
          description: 'The exact instructions for what code to write inside the file.'
        }
      },
      required: ['file_name', 'prompt']
    }
  },
  {
    name: 'open_in_vscode',
    description:
      "Opens the currently active file or project in Visual Studio Code. Use this when the user says 'open it in vscode'.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'teleport_windows',
    description:
      "Moves, resizes, and stacks physical desktop application windows based on the user's voice command.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        commands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              appName: {
                type: Type.STRING,
                description: "The name of the app (e.g., 'code', 'brave', 'chrome')"
              },
              position: {
                type: Type.STRING,
                enum: [
                  'left',
                  'right',
                  'top-left',
                  'bottom-left',
                  'top-right',
                  'bottom-right',
                  'maximize'
                ]
              }
            }
          }
        }
      },
      required: ['commands']
    }
  },
  {
    name: 'save_core_memory',
    description:
      'Saves an important fact, preference, or detail about the user into long-term permanent memory (e.g., dates of birth, names, important events, user preferences). Use this when the user explicitly asks you to remember something.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: {
          type: Type.STRING,
          description:
            "The exact, concise fact to remember (e.g., 'The user's date of birth is October 12th')."
        }
      },
      required: ['fact']
    }
  },
  {
    name: 'retrieve_core_memory',
    description:
      "Retrieves the user's permanent memory bank to answer questions about past facts, preferences, or personal details. Use this if the user asks a personal question that isn't in the immediate chat context.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'deploy_wormhole',
    description:
      'Exposes a local server port to the public internet. Use this when the user asks to share a local project, open a wormhole, or deploy localhost.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        port: {
          type: Type.NUMBER,
          description: 'The localhost port to expose (e.g., 3000, 5173, 8080).'
        }
      },
      required: ['port']
    }
  },
  {
    name: 'close_wormhole',
    description:
      'Closes the public internet exposure of a local server port. Use this when the user asks to stop sharing a local project, close a wormhole, or stop deploying localhost.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'ingest_codebase',
    description:
      'Reads a local folder path and saves it to Vector Memory. Use this to scan a new folder OR resume scanning a folder that was previously paused.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dirPath: {
          type: Type.STRING,
          description: 'The absolute path of the directory to ingest or resume.'
        }
      },
      required: ['dirPath']
    }
  },
  {
    name: 'consult_oracle',
    description:
      "Use this to answer complex questions about the user's local code. It triggers a RAG search against the ingested codebase.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The specific coding question regarding the ingested codebase.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'deep_research',
    description:
      "ACTION: Autonomous RAG Agent. Performs a deep web crawl, synthesizes a report using Llama 3. Use this when the user asks to 'research', 'build a report', or needs you to summarize real-world information.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The exact research question.' }
      },
      required: ['query']
    }
  },
  {
    name: 'create_widget',
    description:
      'ACTION: Generates and spawns a live, floating desktop widget. Use this when the user asks for a UI element like a timer, clock, stock ticker, or calculator. Generate a complete, self-contained HTML document with Tailwind CSS and interactive JavaScript.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        html_code: {
          type: Type.STRING,
          description:
            'The raw, complete HTML code (including <style> and <script> tags) for the widget. It MUST use a transparent body background and modern dark-mode aesthetic.'
        },
        width: {
          type: Type.NUMBER,
          description: 'Estimated width of the widget in pixels (e.g., 300).'
        },
        height: {
          type: Type.NUMBER,
          description: 'Estimated height of the widget in pixels (e.g., 400).'
        }
      },
      required: ['html_code', 'width', 'height']
    }
  },
  {
    name: 'close_widgets',
    description:
      'ACTION: Closes and removes all active floating desktop widgets generated by the AI. Use this when the user says "clear widgets", "close the clock", "hide the timer", or "clean my screen".',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'build_animated_website',
    description:
      'ACTION: Spawns the IRIS Live Forge and generates a full, highly animated, real-time website using Tailwind CSS and GSAP. Use this when the user asks you to build a landing page, a portfolio, a 3D site, or a complex web interface.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description:
            'The highly detailed instructions for the website. Include requests for colors, GSAP animations, layout (Header, Hero, Features, Footer), and specific vibes.'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'execute_macro',
    description:
      'Triggers a named automation routine. User misspelling of macro/workflow names is permitted.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        macro_name: { type: Type.STRING, description: 'The exact name of the macro.' }
      },
      required: ['macro_name']
    }
  },
  {
    name: 'smart_drop_zones',
    description:
      'Visually sorts and physically moves files into categorized folders. Must be used AFTER reading a directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        base_directory: {
          type: Type.STRING,
          description:
            'The absolute path of the root folder being sorted (e.g., "C:\\Users\\Harsh\\Downloads").'
        },
        files_to_sort: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              file_path: {
                type: Type.STRING,
                description: 'Absolute path to the file.'
              },
              category: {
                type: Type.STRING,
                description: 'Category bucket: "Images", "Documents", or "Code".'
              }
            }
          }
        }
      },
      required: ['base_directory', 'files_to_sort']
    }
  },
  {
    name: 'lock_system_vault',
    description:
      'Instantly locks the IRIS OS system, disconnects the AI, and returns the user to the secure biometric lock screen. Use this strictly when the user says "Lock the system", "Lock down", or "Activate Sentry Mode".',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
]