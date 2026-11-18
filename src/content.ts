import type { Chapter } from "./types";

// Sources for every product claim below: the agentes-chat/agentes-chat repository
// (README.md, SELF_HOSTING.md, docs/adr/0030, 0120, 0167, 0173) and agentes.chat/terms.
// The story (Minh, Hà, Trang, the Safari login bug, the 2 a.m. checkout bug) is an illustration.

export const deckTitle = "agentes.chat cho team";

export const chapters: readonly Chapter[] = [
  {
    title: "Hôm nay",
    lessons: [
      {
        slug: "thu-hai",
        title: "Thứ Hai, lỗi Safari",
        subtitle: "Ai cũng có Claude Code trên máy mình. Một lỗi nhỏ cho thấy vì sao vậy là chưa đủ.",
        minutes: 4,
        level: "Bối cảnh",
        nodes: [
          { id: "minh", kind: "person", at: [-4.4, -3.2], label: "Minh", tone: "blue" },
          { id: "aiMinh", kind: "laptop", at: [-1.4, -3.2], label: "Claude Code của Minh", tone: "violet" },
          { id: "ha", kind: "person", at: [-4.4, 0], label: "Hà", tone: "blue" },
          { id: "aiHa", kind: "laptop", at: [-1.4, 0], label: "Claude Code của Hà", tone: "violet" },
          { id: "trang", kind: "person", at: [-4.4, 3.2], label: "Trang", tone: "orange" },
          { id: "aiTrang", kind: "laptop", at: [-1.4, 3.2], label: "Claude Code của Trang", tone: "violet" },
          { id: "khach", kind: "person", at: [1.6, 3.2], label: "Khách hàng", tone: "rust" },
        ],
        steps: [
          {
            short: "9 giờ sáng",
            tag: "VẤN ĐỀ",
            title: "9 giờ sáng thứ Hai, khách không đăng nhập được",
            body: [
              "Trang, PM của dự án, nhận phản hồi: khách dùng Safari không đăng nhập được. Trang giao việc cho Hà, dev mới vào team được hai tuần.",
              "Cả team đều dùng Claude Code, mỗi người trên máy mình, với `CLAUDE.md`, memory, skill và MCP của riêng máy đó.",
            ],
            key: "AI đang làm việc cho từng người, chưa làm việc cho team.",
            show: ["minh", "aiMinh", "ha", "aiHa", "trang", "aiTrang", "khach"],
            focus: ["trang"],
            flows: [
              { from: "khach", to: "trang", kind: "request", carries: "báo lỗi", intent: "Tôi không đăng nhập được trên Safari" },
              { from: "trang", to: "ha", kind: "request", carries: "giao việc", intent: "Hà xem giúp chị lỗi đăng nhập Safari nhé", reaction: "Dạ, để em hỏi AI của em" },
            ],
          },
          {
            short: "AI của Hà",
            tag: "VẤN ĐỀ",
            title: "AI của Hà bắt đầu từ con số không",
            body: [
              "Claude Code của Minh đã quen codebase: Minh dùng lâu, sửa và dặn dò nhiều lần, nên nó nhớ quy ước và làm đúng ý ngay lần đầu.",
              "Claude Code của Hà thì như ngày đầu. Cùng một câu hỏi, hai máy cho hai chất lượng khác nhau.",
            ],
            key: "Chất lượng AI phụ thuộc vào việc bạn ngồi máy nào.",
            show: ["minh", "aiMinh", "ha", "aiHa", "trang", "aiTrang", "khach"],
            focus: ["aiHa", "aiMinh"],
            flows: [
              { from: "ha", to: "aiHa", kind: "request", carries: "lỗi Safari", intent: "Sao Safari không đăng nhập được nhỉ?" },
              { from: "aiHa", to: "ha", kind: "response", carries: "đoán mò", intent: "Thử xoá cookie rồi đăng nhập lại xem", reaction: "Không ăn thua, lại phải đoán tiếp" },
            ],
          },
          {
            short: "Người làm proxy",
            tag: "VẤN ĐỀ",
            title: "Hà hỏi Minh, Minh hỏi AI của Minh",
            body: [
              "Minh nhớ mang máng đã gặp lỗi này. Hà nhắn Minh, Minh hỏi Claude Code của mình, chép câu trả lời gửi lại, Hà dán vào AI của Hà.",
              "Cả hai AI đều nắm một phần, nhưng không có cách nào để chúng nói chuyện trực tiếp với nhau. Người đứng giữa chỉ còn làm việc chuyển tin.",
            ],
            key: "Con người đang làm proxy cho AI, vì AI của nhau không nói chuyện được với nhau.",
            show: ["minh", "aiMinh", "ha", "aiHa", "trang", "aiTrang", "khach"],
            focus: ["minh", "ha"],
            flows: [
              { from: "ha", to: "minh", kind: "request", carries: "hỏi", intent: "Anh Minh ơi, lỗi Safari này anh gặp chưa?" },
              { from: "minh", to: "aiMinh", kind: "request", carries: "hỏi lại", intent: "Để anh hỏi AI của anh" },
              { from: "aiMinh", to: "minh", kind: "response", carries: "câu trả lời", reaction: "Đây, anh chép gửi em" },
              { from: "minh", to: "ha", kind: "response", carries: "chép tay", reaction: "Em dán vào AI của em thử" },
            ],
          },
          {
            short: "Làm lại từ đầu",
            tag: "VẤN ĐỀ",
            title: "Hết một buổi chiều cho lỗi đã sửa tháng trước",
            body: [
              "Hà gỡ xong lúc 5 giờ chiều. Hoá ra Minh đã sửa đúng lỗi này tháng trước, ở một trang khác. Cách gỡ nằm trong máy Minh và trong đầu Minh.",
              "Cấu hình hay cũng vậy: Minh có MCP đọc Jira và skill review riêng. Muốn Hà dùng, Minh phải gửi file để Hà tự cài lại. Không ai nhớ gửi cho Trang.",
            ],
            key: "Cái hay của một người chỉ tới được người khác khi có ai đó chép tay, và thường là không tới.",
            show: ["minh", "aiMinh", "ha", "aiHa", "trang", "aiTrang", "khach"],
            focus: ["ha"],
            flows: [
              { from: "aiHa", to: "ha", kind: "response", carries: "bản sửa", intent: "Ra rồi, lỗi nằm ở phiên đăng nhập", reaction: "Mất cả buổi chiều, mà anh Minh sửa rồi" },
              { from: "minh", to: "ha", kind: "request", carries: "file cấu hình", intent: "Gửi em file MCP với skill review, tự cài nhé", reaction: "Lại cài tay, không biết bản nào mới nhất" },
            ],
          },
          {
            short: "Minh nghỉ phép",
            tag: "VẤN ĐỀ",
            title: "Minh nghỉ phép, kinh nghiệm nằm lại trong máy",
            body: [
              "Tuần sau Minh nghỉ phép. Những gì Minh đã dạy AI của mình, prompt hay, cách gỡ lỗi Safari, đều nằm lại trong máy Minh. Người nghỉ việc còn mang theo cả bộ AI đã dạy.",
              "Trang không thấy ai đang làm gì với AI. Kinh nghiệm có giá trị nhất của team bị khoá trong từng máy.",
            ],
            key: "Mỗi người đều có AI, nhưng AI chưa thuộc về team.",
            show: ["minh", "aiMinh", "ha", "aiHa", "trang", "aiTrang"],
            focus: ["aiMinh", "aiHa", "aiTrang"],
            moves: {
              minh: [-5.9, -5.4],
              aiMinh: [-2.9, -5.4],
              trang: [-2.9, 5.4],
              aiTrang: [0.1, 5.4],
            },
            fences: [
              ["minh", "aiMinh"],
              ["ha", "aiHa"],
              ["trang", "aiTrang"],
            ],
            flows: [
              { from: "ha", to: "aiHa", kind: "request", carries: "hỏi", intent: "Cấu hình MCP của anh Minh để đâu nhỉ?", reaction: "Không biết, nó chỉ có trên máy Minh" },
              { from: "trang", to: "aiTrang", kind: "request", carries: "câu hỏi", intent: "Có cách nào để AI làm việc cho cả team không?" },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Đưa agent vào team",
    lessons: [
      {
        slug: "kenh-chung",
        title: "Cả team chung một kênh",
        subtitle: "Quay lại sáng thứ Hai đó. Lần này Minh, Hà, Trang và các agent làm việc trong cùng một kênh.",
        minutes: 4,
        level: "Team coop",
        nodes: [
          { id: "chat", kind: "chat", at: [0, 0], label: "#web-app", tone: "green" },
          { id: "minh", kind: "person", at: [-4, -2.6], label: "Minh", tone: "blue" },
          { id: "ha", kind: "person", at: [-4, 0], label: "Hà", tone: "blue" },
          { id: "trang", kind: "person", at: [-4, 2.6], label: "Trang", tone: "orange" },
          { id: "dev", kind: "agent", at: [4, -1.4], label: "@dev", tone: "violet" },
          { id: "qa", kind: "agent", at: [4, 1.4], label: "@qa", tone: "violet" },
          { id: "router", kind: "gate", at: [0, 3.2], label: "Router" },
          { id: "board", kind: "board", at: [-1.6, -3.2], label: "Task board" },
          { id: "wiki", kind: "book", at: [1.8, -3.2], label: "Wiki + Drive", tone: "green" },
        ],
        steps: [
          {
            short: "Một kênh",
            tag: "Ý TƯỞNG",
            title: "Một kênh, cả người lẫn agent",
            body: [
              "Mỗi dự án là một kênh. Kênh `#web-app` có Minh, Hà, Trang, và hai agent: `@dev` và `@qa`.",
              "Mỗi agent có vai trò, hướng dẫn, công cụ, ngân sách tháng, và **một người chủ** nhận các yêu cầu duyệt và cảnh báo ngân sách của nó. Minh là chủ của `@dev`.",
            ],
            show: ["chat", "minh", "ha", "trang", "dev", "qa"],
            focus: ["chat"],
            flows: [
              { from: "minh", to: "chat", kind: "handshake", carries: "thêm agent", intent: "Mình thêm @dev và @qa vào kênh nhé" },
              { from: "chat", to: "dev", kind: "handshake", carries: "vào kênh", reaction: "@dev đây, Minh là chủ của mình" },
            ],
          },
          {
            short: "Gọi @",
            tag: "CÁCH LÀM",
            title: "Trang gọi @dev, như gọi đồng nghiệp",
            body: [
              "Trang gõ `@dev khách không đăng nhập được trên Safari` vào kênh. Không cần đợi Hà rảnh, không cần hỏi qua Minh.",
              "Agent nhận việc, làm, rồi trả lời ngay trong thread để cả kênh cùng thấy, kể cả Hà và Minh.",
            ],
            show: ["chat", "minh", "ha", "trang", "dev", "qa"],
            focus: ["dev"],
            flows: [
              { from: "trang", to: "chat", kind: "request", carries: "@dev lỗi Safari", intent: "@dev khách không đăng nhập được trên Safari" },
              { from: "chat", to: "dev", kind: "request", carries: "việc được giao", reaction: "Nhận việc, mình xem ngay" },
              { from: "dev", to: "chat", kind: "response", carries: "bản sửa", intent: "Đã sửa phiên đăng nhập, PR ở trong thread" },
            ],
          },
          {
            short: "Router",
            tag: "CÁCH LÀM",
            title: "Không tag ai? Router tự chọn",
            body: [
              "Tin nhắn không nhắc ai sẽ đi qua router. Router chọn tối đa bốn agent trả lời, hoặc không ai, và tin nhắn ghi rõ ai đã chọn.",
              "Router không bao giờ cấp quyền cho agent.",
            ],
            show: ["chat", "minh", "ha", "trang", "dev", "qa", "router"],
            focus: ["router"],
            flows: [
              { from: "trang", to: "chat", kind: "request", carries: "câu hỏi", intent: "Bản sửa Safari đã test chưa?" },
              { from: "chat", to: "router", kind: "request", carries: "tin không tag" },
              { from: "router", to: "qa", kind: "request", carries: "chọn @qa", intent: "Câu này hợp @qa nhất", reaction: "Để mình chạy test trên Safari" },
            ],
          },
          {
            short: "Task board",
            tag: "CÁCH LÀM",
            title: "Một bảng việc cho cả người và agent",
            body: [
              "Mỗi task có người phụ trách và hạn chót, dù người phụ trách là người hay agent.",
              "Trang nhìn một bảng là biết ai đang làm gì, không cần họp hỏi trạng thái.",
            ],
            show: ["chat", "minh", "ha", "trang", "dev", "qa", "router", "board"],
            focus: ["board"],
            flows: [
              { from: "dev", to: "board", kind: "response", carries: "trạng thái task", intent: "Cập nhật: PR sửa Safari đang chờ review" },
              { from: "board", to: "trang", kind: "response", carries: "tiến độ", reaction: "Nhìn bảng là biết, khỏi họp status" },
            ],
          },
          {
            short: "Wiki",
            tag: "Ý TƯỞNG",
            title: "Học một lần, cả team dùng",
            body: [
              "Minh để lại một dòng trong thread: lỗi này đã gặp tháng trước, ở trang khác. Agent giữ lại quyết định, sự thật và bài học từ các cuộc trò chuyện, và Wiki, Drive của công ty lớn dần theo đó.",
              "Lần sau Hà gặp lỗi tương tự, cách gỡ đã nằm trong wiki. Minh nghỉ phép thì kinh nghiệm vẫn ở lại với team.",
            ],
            key: "Hỏi một lần, lưu một chỗ. Người mới vào đọc wiki thay vì xin một buổi họp.",
            show: ["chat", "minh", "ha", "trang", "dev", "qa", "router", "board", "wiki"],
            focus: ["wiki"],
            flows: [
              { from: "minh", to: "chat", kind: "request", carries: "kinh nghiệm", intent: "Lỗi này anh sửa tháng trước, ở trang khác" },
              { from: "dev", to: "wiki", kind: "response", carries: "bài học", intent: "Ghi vào wiki: cách gỡ lỗi đăng nhập Safari" },
              { from: "ha", to: "wiki", kind: "request", carries: "tra cứu", intent: "Lần sau em đọc wiki, khỏi phải hỏi anh Minh" },
            ],
          },
          {
            short: "Quyền",
            tag: "CÁCH LÀM",
            title: "Công ty quyết định agent nào được làm gì",
            body: [
              "Công ty quyết định ai được nói chuyện với agent nào, và agent làm việc ở kênh nào.",
              "Mỗi kết nối (GitHub, Linear, Jira, Sentry, Notion, Google Drive, hoặc bất kỳ MCP server nào) được nối một lần cho cả công ty. Mỗi agent chỉ nhận đúng phạm vi được cấp.",
            ],
            show: ["chat", "minh", "ha", "trang", "dev", "qa", "router", "board", "wiki"],
            focus: ["dev", "qa"],
            flows: [
              { from: "minh", to: "dev", kind: "handshake", carries: "phạm vi", intent: "@dev được dùng GitHub và Sentry của web-app", reaction: "Nhận đúng phạm vi được cấp, không hơn" },
            ],
          },
        ],
      },
      {
        slug: "hoc-nghe",
        title: "@dev học nghề",
        subtitle: "Skill, trí nhớ riêng, trí nhớ team, routine chạy cả đêm, và thẻ duyệt khi gặp việc rủi ro.",
        minutes: 4,
        level: "Team coop",
        nodes: [
          { id: "dev", kind: "agent", at: [0, 0], label: "@dev", tone: "violet" },
          { id: "skills", kind: "book", at: [-3.6, -1.8], label: "Skills", tone: "violet" },
          { id: "mem", kind: "repo", at: [-3.6, 1.8], label: "Trí nhớ của @dev", tone: "blue" },
          { id: "trang", kind: "person", at: [-3.6, -4.8], label: "Trang", tone: "orange" },
          { id: "team", kind: "board", at: [0, -3.4], label: "Trí nhớ team", tone: "green" },
          { id: "qa", kind: "agent", at: [3.6, -4.8], label: "@qa", tone: "violet" },
          { id: "routine", kind: "clock", at: [3.6, -1.8], label: "Routine", tone: "rust" },
          { id: "sentry", kind: "warn", at: [3.6, 1.8], label: "Sentry", tone: "rust" },
          { id: "minh", kind: "person", at: [0, 3.6], label: "Minh", tone: "blue" },
          { id: "ha", kind: "person", at: [-3.6, 4.8], label: "Hà", tone: "blue" },
        ],
        steps: [
          {
            short: "Skill",
            tag: "Ý TƯỞNG",
            title: "Checklist của Minh thành skill của cả team",
            body: [
              "Checklist review từng phải gửi file cho Hà tự cài. Giờ Minh đưa nó thành một skill: một file Markdown (`SKILL.md`) mô tả một cách làm. Thêm từ file zip, link GitHub hoặc soạn ngay trong app, có phiên bản.",
              "Agent nạp skill khi việc cần tới nó. Cách làm được dùng đi dùng lại có thể được agent đề xuất thành skill mới.",
            ],
            key: "Agent làm theo cách của team, không phải cách chung chung của model.",
            show: ["dev", "skills", "minh"],
            focus: ["skills"],
            flows: [
              { from: "minh", to: "skills", kind: "request", carries: "checklist review", intent: "Đưa checklist review của anh thành skill chung" },
              { from: "skills", to: "dev", kind: "response", carries: "SKILL.md", reaction: "Review theo đúng checklist của Minh" },
            ],
          },
          {
            short: "Trí nhớ riêng",
            tag: "CÁCH LÀM",
            title: "Hà sửa @dev một lần, lần sau nó đã biết",
            body: [
              "Agent giữ lại quyết định, sự thật, sở thích và bài học từ các cuộc trò chuyện. Bị sửa một lần, hay bị từ chối duyệt một lần, nó tự ghi lại, không cần ai dặn \"nhớ nhé\".",
              "Agent còn đề xuất sửa hướng dẫn của chính nó, và người chủ quyết định nhận hay không. Hà không còn phải dùng một AI bắt đầu từ con số không.",
            ],
            key: "Sửa agent một lần là đủ, lần sau nó đã biết.",
            show: ["dev", "skills", "mem", "minh", "ha"],
            focus: ["mem"],
            flows: [
              { from: "ha", to: "dev", kind: "request", carries: "sửa một lần", intent: "Repo này dùng pnpm, đừng dùng npm nhé" },
              { from: "dev", to: "mem", kind: "response", carries: "bài học", intent: "Ghi lại, lần sau không cần ai dặn" },
              { from: "dev", to: "minh", kind: "request", carries: "đề xuất", intent: "Đề xuất thêm quy ước pnpm vào hướng dẫn", reaction: "Hợp lý, nhận đề xuất này" },
            ],
          },
          {
            short: "Trí nhớ team",
            tag: "CÁCH LÀM",
            title: "Trang đặt luật, mọi agent cùng đọc",
            body: [
              "Luật và thói quen của team, ví dụ \"PR nào cũng phải có test\", được lưu thành trí nhớ team: không thuộc riêng agent nào, giữ đúng lời người đã nói.",
              "Mọi agent đọc trí nhớ team trong mỗi lần chạy. Chỉ người thật mới thêm được, nội dung lấy từ bên ngoài không ghi vào được. Xem, sửa, xoá trong **Settings › General**.",
            ],
            key: "Dặn một lần, cả team agent cùng làm theo.",
            show: ["dev", "skills", "mem", "minh", "ha", "trang", "team", "qa"],
            focus: ["team"],
            flows: [
              { from: "trang", to: "team", kind: "request", carries: "luật team", intent: "Từ nay PR nào cũng phải có test" },
              { from: "team", to: "dev", kind: "response", carries: "luật" },
              { from: "team", to: "qa", kind: "response", carries: "luật", reaction: "Mọi agent cùng đọc luật này" },
            ],
          },
          {
            short: "Routine",
            tag: "CÁCH LÀM",
            title: "Minh đặt routine: Sentry báo là @dev nhận việc",
            body: [
              "Agent chạy theo lịch, ví dụ `mỗi ngày làm việc lúc 9h`, hoặc theo sự kiện: issue mới trên Sentry, pull request mới, task mới, email đến.",
              "Kết quả được gửi vào kênh, DM hoặc Drive. Không ai phải thức canh.",
            ],
            key: "Việc không đợi giờ hành chính.",
            show: ["dev", "skills", "mem", "minh", "ha", "trang", "team", "qa", "routine", "sentry"],
            focus: ["routine"],
            flows: [
              { from: "minh", to: "routine", kind: "request", carries: "lịch", intent: "Sentry có issue mới thì @dev nhận việc ngay" },
              { from: "sentry", to: "routine", kind: "request", carries: "issue mới" },
              { from: "routine", to: "dev", kind: "request", carries: "việc", reaction: "Nhận việc, không ai phải thức canh" },
            ],
          },
          {
            short: "Xin duyệt",
            tag: "RỦI RO",
            title: "Gặp việc rủi ro thì xin Minh duyệt",
            body: [
              "Merge, deploy, rollback và mọi thao tác nhạy cảm dừng lại thành thẻ duyệt trong chat, gửi tới người chủ agent hoặc admin, có thông báo đẩy trên điện thoại.",
              "Việc đã duyệt chạy đúng một lần, đúng như đã duyệt. Agent bí thì hỏi, câu hỏi nằm chung hộp thông báo.",
            ],
            key: "Agent làm cả đêm, nhưng quyết định rủi ro vẫn là của người.",
            show: ["dev", "skills", "mem", "minh", "ha", "trang", "team", "qa", "routine", "sentry"],
            focus: ["minh"],
            flows: [
              { from: "dev", to: "minh", kind: "request", carries: "thẻ duyệt", intent: "Bản sửa sẵn sàng, Minh duyệt merge nhé?" },
              { from: "minh", to: "dev", kind: "response", carries: "đã duyệt", intent: "Duyệt, merge đi", reaction: "Chạy đúng một lần, đúng như đã duyệt" },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Một đêm làm việc",
    lessons: [
      {
        slug: "hai-gio-sang",
        title: "2 giờ sáng, ba tuần sau",
        subtitle: "Kịch bản minh hoạ: một lỗi mới trên production, sửa xong trước giờ làm, không ai phải thức.",
        minutes: 5,
        level: "Kịch bản",
        nodes: [
          { id: "sentry", kind: "warn", at: [-6.6, 0], label: "Sentry", tone: "rust" },
          { id: "wiki", kind: "book", at: [-3.6, -2.8], label: "Wiki", tone: "green" },
          { id: "dev", kind: "agent", at: [-3.6, 0], label: "@dev", tone: "violet" },
          { id: "pr", kind: "repo", at: [-0.6, 0], label: "Pull request", tone: "blue" },
          { id: "review", kind: "agent", at: [-0.6, -2.8], label: "@review", tone: "violet" },
          { id: "ci", kind: "gate", at: [2.4, 0], label: "CI", tone: "green" },
          { id: "main", kind: "repo", at: [5.4, 0], label: "main", tone: "green" },
          { id: "stg", kind: "rocket", at: [8, -1.8], label: "Staging", tone: "orange" },
          { id: "prod", kind: "rocket", at: [8, 1.8], label: "Production", tone: "rust" },
          { id: "minh", kind: "person", at: [-3.6, 2.8], label: "Minh", tone: "blue" },
          { id: "trang", kind: "person", at: [-0.6, 2.8], label: "Trang", tone: "orange" },
          { id: "ha", kind: "person", at: [2.4, 2.8], label: "Hà", tone: "blue" },
        ],
        steps: [
          {
            short: "02:00",
            tag: "VẤN ĐỀ",
            title: "02:00, Sentry báo lỗi ở trang thanh toán",
            body: [
              "Ba tuần sau. Bản release chiều qua làm một số khách dùng Safari bị đăng xuất giữa lúc thanh toán. Sentry ghi nhận một issue mới.",
              "Routine Minh đặt chạy theo sự kiện: issue mới là `@dev` nhận việc ngay. Cả team đang ngủ.",
            ],
            show: ["sentry", "dev", "minh", "trang", "ha"],
            focus: ["sentry", "dev"],
            flows: [
              { from: "sentry", to: "dev", kind: "request", carries: "issue mới", intent: "Issue mới: Safari đăng xuất ở trang thanh toán", reaction: "Nhận việc, đọc lỗi ngay" },
            ],
          },
          {
            short: "Lỗi quen",
            tag: "CÁCH LÀM",
            title: "@dev nhận ra một lỗi quen",
            body: [
              "`@dev` đọc wiki: cách gỡ lỗi đăng nhập Safari mà team để lại ba tuần trước. Cùng nguyên nhân, khác trang. Lần trước Hà mất cả buổi chiều.",
              "`@dev` dùng Claude Code trên máy agent: clone repo, tái hiện lỗi, viết bản sửa kèm test theo luật của team, rồi mở pull request.",
            ],
            show: ["sentry", "wiki", "dev", "pr", "minh", "trang", "ha"],
            focus: ["wiki", "dev"],
            flows: [
              { from: "wiki", to: "dev", kind: "response", carries: "bài học cũ", reaction: "Giống lỗi Safari lần trước, khác trang thôi" },
              { from: "dev", to: "pr", kind: "request", carries: "bản sửa + test", intent: "Mở PR, có test đúng luật của team" },
            ],
          },
          {
            short: "CI + review",
            tag: "CÁCH LÀM",
            title: "CI chạy, một agent khác review",
            body: [
              "CI chạy test. `@review`, một agent khác với agent vừa viết code, đọc diff và để lại nhận xét. Hai agent trao đổi với nhau trong một cuộc trò chuyện phụ, không cần ai tag.",
              "Cổng chặn thật là branch protection của GitHub: CI đỏ thì không merge được.",
            ],
            show: ["sentry", "wiki", "dev", "pr", "review", "ci", "minh", "trang", "ha"],
            focus: ["review", "ci"],
            flows: [
              { from: "pr", to: "review", kind: "request", carries: "diff" },
              { from: "review", to: "dev", kind: "handshake", carries: "nhận xét", intent: "Thêm test cho Safari bản cũ nữa nhé", reaction: "Đã thêm, đẩy lại PR" },
              { from: "pr", to: "ci", kind: "request", carries: "chạy test" },
              { from: "ci", to: "pr", kind: "response", carries: "xanh", intent: "Test xanh hết" },
            ],
          },
          {
            short: "Thẻ duyệt",
            tag: "CÁCH LÀM",
            title: "CI xanh, @dev dừng ở thẻ duyệt",
            body: [
              "Mức duyệt của `@dev` đang là **Chỉ việc rủi ro**: merge và deploy hiện thành thẻ duyệt trong chat, gửi tới Minh, có thông báo đẩy trên điện thoại.",
              "Không ai phải thức. Thẻ duyệt nằm đó chờ người, và việc đã duyệt chạy đúng một lần, đúng như đã duyệt.",
            ],
            show: ["sentry", "wiki", "dev", "pr", "review", "ci", "minh", "trang", "ha"],
            focus: ["minh"],
            flows: [
              { from: "dev", to: "minh", kind: "request", carries: "thẻ duyệt", intent: "Sẵn sàng merge và deploy, Minh duyệt nhé?", reaction: "Zzz… sáng mai anh xem" },
            ],
          },
          {
            short: "Duyệt, canary",
            tag: "CÁCH LÀM",
            title: "07:45, Minh bấm duyệt, bản sửa lên theo canary",
            body: [
              "Minh đọc thẻ duyệt trên điện thoại: diff, kết quả test, nhận xét của `@review`. Một lần bấm duyệt.",
              "`@dev` merge vào main. Pipeline của mình release lên staging và chạy test tự động, rồi lên production theo canary: một phần nhỏ người dùng trước, tự rollback khi chỉ số xấu đi.",
            ],
            show: ["sentry", "wiki", "dev", "pr", "review", "ci", "main", "stg", "prod", "minh", "trang", "ha"],
            focus: ["main", "stg", "prod"],
            flows: [
              { from: "minh", to: "dev", kind: "response", carries: "đã duyệt", intent: "Đọc diff rồi, duyệt" },
              { from: "ci", to: "main", kind: "request", carries: "merge" },
              { from: "main", to: "stg", kind: "request", carries: "release" },
              { from: "stg", to: "prod", kind: "request", carries: "canary", reaction: "Canary ổn, lên dần cho mọi người" },
            ],
          },
          {
            short: "08:30",
            tag: "KẾT QUẢ",
            title: "08:30, Trang đọc bản tóm tắt",
            body: [
              "Sáng ra, kênh có bản tóm tắt: lỗi gì, sửa thế nào, PR nào, đã lên tới đâu.",
              "Hà xem lại PR thay vì làm lại từ đầu như sáng thứ Hai ba tuần trước.",
            ],
            key: "Lỗi được sửa trong đêm, người chỉ còn duyệt và xem lại.",
            show: ["sentry", "wiki", "dev", "pr", "review", "ci", "main", "stg", "prod", "minh", "trang", "ha"],
            focus: ["trang", "ha"],
            flows: [
              { from: "dev", to: "trang", kind: "response", carries: "bản tóm tắt", intent: "Tóm tắt: lỗi gì, sửa thế nào, đã lên tới đâu", reaction: "Xong trước khi khách kịp báo" },
              { from: "pr", to: "ha", kind: "response", carries: "PR để xem lại", reaction: "Em xem lại thôi, không phải làm lại" },
            ],
          },
        ],
      },
      {
        slug: "muc-duyet",
        title: "Vì sao dám tin @dev?",
        subtitle: "Đêm qua @dev tự làm tới đâu, và cái gì chặn nó lại.",
        minutes: 4,
        level: "An toàn",
        nodes: [
          { id: "dev", kind: "agent", at: [-4, 0], label: "@dev", tone: "violet" },
          { id: "gate", kind: "gate", at: [-0.6, 0], label: "Cổng duyệt", tone: "orange" },
          { id: "minh", kind: "person", at: [-0.6, -2.8], label: "Minh", tone: "blue" },
          { id: "action", kind: "rocket", at: [3, 0], label: "Merge / deploy", tone: "green" },
          { id: "budget", kind: "wallet", at: [-3, 2.8], label: "Ngân sách", tone: "orange" },
          { id: "audit", kind: "book", at: [3, 2.8], label: "Audit log" },
        ],
        steps: [
          {
            short: "Ba mức",
            tag: "Ý TƯỞNG",
            title: "Mỗi agent có một mức duyệt",
            body: [
              "Ba mức, đặt riêng cho từng agent: **Luôn hỏi**, **Chỉ việc rủi ro** (mặc định), **Không bao giờ hỏi**.",
              "Đêm qua `@dev` dừng ở thẻ duyệt vì Minh để nó ở mức mặc định.",
            ],
            show: ["dev", "gate", "minh", "action"],
            focus: ["gate"],
            flows: [
              { from: "minh", to: "gate", kind: "handshake", carries: "mức duyệt", intent: "@dev: Chỉ việc rủi ro, như mặc định" },
            ],
          },
          {
            short: "Chờ người",
            tag: "CÁCH LÀM",
            title: "Mặc định: việc rủi ro chờ người",
            body: [
              "Merge, deploy, rollback và mọi thao tác mà kết nối đánh dấu nhạy cảm hiện thành thẻ duyệt trong chat, gửi tới người chủ agent hoặc admin.",
              "Việc đã duyệt chạy đúng một lần, đúng như đã duyệt.",
            ],
            show: ["dev", "gate", "minh", "action"],
            focus: ["gate", "minh"],
            flows: [
              { from: "dev", to: "gate", kind: "request", carries: "merge, deploy", intent: "Muốn merge và deploy bản sửa" },
              { from: "gate", to: "minh", kind: "request", carries: "thẻ duyệt" },
              { from: "minh", to: "gate", kind: "response", carries: "đã duyệt", intent: "Duyệt" },
              { from: "gate", to: "action", kind: "request", carries: "chạy một lần", reaction: "Chạy đúng một lần, đúng như đã duyệt" },
            ],
          },
          {
            short: "Không hỏi",
            tag: "RỦI RO",
            title: "“Không bao giờ hỏi” chỉ bỏ câu hỏi",
            body: [
              "Mức này bỏ thẻ duyệt cho mọi thứ agent được dùng, kể cả merge, deploy, rollback. Nó vẫn giữ: phạm vi quyền, công cụ đã tắt, ngân sách, các thao tác git bị cấm.",
              "Nó **không** kiểm tra code đúng hay sai. Việc đó vẫn là của CI, của `@review` và của canary.",
            ],
            show: ["dev", "gate", "minh", "action"],
            focus: ["action"],
            flows: [
              { from: "dev", to: "action", kind: "request", carries: "merge", intent: "Ở mức này mình tự merge, không cần thẻ" },
              { from: "action", to: "minh", kind: "response", carries: "kết quả", reaction: "Nhưng nó không kiểm code đúng hay sai" },
            ],
          },
          {
            short: "Ngân sách",
            tag: "CÁCH LÀM",
            title: "Ngân sách tháng cho từng agent",
            body: [
              "Mỗi agent có ngân sách tháng, được kiểm trước mỗi lần gọi model. Chi phí của từng lần gọi đều được ghi lại.",
              "Hết ngân sách thì agent dừng, và Minh, người chủ, nhận cảnh báo.",
            ],
            show: ["dev", "gate", "minh", "action", "budget"],
            focus: ["budget"],
            flows: [
              { from: "dev", to: "budget", kind: "request", carries: "kiểm ngân sách", intent: "Còn ngân sách tháng không?" },
              { from: "budget", to: "dev", kind: "response", carries: "chi phí", intent: "Còn, và lần gọi này được ghi lại" },
            ],
          },
          {
            short: "Audit",
            tag: "CÁCH LÀM",
            title: "Mọi việc đều để lại dấu vết",
            body: [
              "Mỗi lần agent gọi công cụ đều có một dòng audit, kể cả khi chạy ở mức Không bao giờ hỏi.",
              "Sáng ra, Minh đọc lại được `@dev` đã làm gì lúc 2 giờ sáng.",
            ],
            show: ["dev", "gate", "minh", "action", "budget", "audit"],
            focus: ["audit"],
            flows: [
              { from: "dev", to: "audit", kind: "response", carries: "dòng audit", intent: "Mỗi lần gọi công cụ, một dòng audit" },
              { from: "audit", to: "minh", kind: "response", carries: "dấu vết", reaction: "Đêm qua @dev làm gì, đọc là biết" },
            ],
          },
          {
            short: "Nới quyền",
            tag: "KẾT QUẢ",
            title: "Nới quyền theo dữ liệu",
            body: [
              "**Giai đoạn 1:** mức **Chỉ việc rủi ro**. Người duyệt merge và release, như Minh sáng nay.",
              "**Giai đoạn 2:** agent đã chạy ổn chuyển sang **Không bao giờ hỏi** cho merge và staging. Production vẫn đi qua canary và rollback tự động.",
            ],
            key: "Bắt đầu chặt, nới dần khi có số liệu.",
            show: ["dev", "gate", "minh", "action", "budget", "audit"],
            focus: ["gate", "action"],
            flows: [
              { from: "audit", to: "minh", kind: "response", carries: "số liệu", intent: "Ba tuần, mọi lần merge đều ổn" },
              { from: "minh", to: "gate", kind: "handshake", carries: "nới quyền", intent: "Merge và staging khỏi hỏi, production vẫn canary" },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Làm thật",
    lessons: [
      {
        slug: "tu-host",
        title: "@dev chạy ở đâu, tốn gì?",
        subtitle: "Tự host server, gắn máy làm việc cho agent, để Claude Code làm bộ não.",
        minutes: 3,
        level: "Hạ tầng",
        nodes: [
          { id: "server", kind: "server", at: [0, -1], label: "agentes.chat (tự host)", tone: "green" },
          { id: "minh", kind: "person", at: [-4.4, -2.6], label: "Minh", tone: "blue" },
          { id: "trang", kind: "person", at: [-4.4, 0.4], label: "Trang", tone: "orange" },
          { id: "gh", kind: "repo", at: [4.4, -1.4], label: "GitHub", tone: "neutral" },
          { id: "r1", kind: "laptop", at: [-3.2, 3.2], label: "Máy agent 1", tone: "violet" },
          { id: "r2", kind: "laptop", at: [0, 3.2], label: "Máy agent 2", tone: "violet" },
          { id: "r3", kind: "laptop", at: [3.2, 3.2], label: "Máy agent 3", tone: "violet" },
        ],
        steps: [
          {
            short: "Tự host",
            tag: "CÁCH LÀM",
            title: "Một lệnh để tự host",
            body: [
              "Cài bằng một lệnh và một file Docker Compose: app và Postgres (pgvector), migration tự chạy khi khởi động. Truy cập qua HTTPS riêng trong mạng Tailscale của công ty, hoặc qua tên miền công khai với Caddy.",
              "Mã nguồn mở AGPL-3.0: tự host không mất phí bản quyền.",
            ],
            show: ["server", "minh", "trang"],
            focus: ["server"],
            flows: [
              { from: "minh", to: "server", kind: "request", carries: "docker compose", intent: "Một lệnh, một file Docker Compose", reaction: "App và Postgres chạy, migration tự chạy" },
              { from: "trang", to: "minh", kind: "request", carries: "câu hỏi", intent: "Tự host có mất phí bản quyền không anh?", reaction: "Không, mã nguồn mở AGPL-3.0" },
            ],
          },
          {
            short: "Máy agent",
            tag: "CÁCH LÀM",
            title: "Gắn máy, để Claude Code làm bộ não",
            body: [
              "Vào **Settings › Devices › Connect a device**, chạy lệnh cài runner trên máy đó: một server, một VM hay một laptop. Agent chạy lệnh, chạy code và mở trình duyệt trên máy có runner.",
              "Trên máy đã gắn, agent suy nghĩ bằng Claude Code (hoặc Codex, đang thử nghiệm) với tài khoản đăng nhập trên chính máy đó, thay vì gọi API. Thông tin đăng nhập không rời khỏi máy. Server chỉ biết tên tài khoản, gói và mức đã dùng.",
            ],
            show: ["server", "minh", "trang", "r1", "r2", "r3"],
            focus: ["r1", "r2", "r3"],
            flows: [
              { from: "r1", to: "server", kind: "handshake", carries: "kết nối runner", intent: "Runner đã cài, kết nối server" },
              { from: "server", to: "r1", kind: "request", carries: "việc", intent: "Việc mới cho @dev, chạy trên máy 1" },
              { from: "r1", to: "server", kind: "response", carries: "kết quả", intent: "Nghĩ bằng Claude Code, tài khoản ở máy này", reaction: "Mình chỉ biết tên tài khoản, gói và mức đã dùng" },
            ],
          },
          {
            short: "Cách ly",
            tag: "CÁCH LÀM",
            title: "Mỗi agent một user riêng, git qua GitHub App",
            body: [
              "Cài runner ở **system mode** (cờ `--system`, chạy bằng root): mỗi agent chạy dưới một user hệ điều hành riêng, không đụng được thư mục, SSH key hay tài khoản git của agent khác, hay của người dùng máy.",
              "Với GitHub App, máy agent lấy code thẳng từ GitHub bằng token chỉ đọc, hết hạn sau một giờ, cho đúng một repo. Mọi lần push đều đi qua server của mình.",
            ],
            show: ["server", "minh", "trang", "r1", "r2", "r3", "gh"],
            focus: ["r2", "gh"],
            flows: [
              { from: "gh", to: "r2", kind: "response", carries: "code (chỉ đọc)", intent: "Token chỉ đọc, một repo, hết hạn sau một giờ" },
              { from: "r2", to: "server", kind: "request", carries: "push", intent: "Sửa xong, push qua server" },
              { from: "server", to: "gh", kind: "request", carries: "push", intent: "Mọi lần push đều đi qua server này" },
            ],
          },
          {
            short: "Mở rộng",
            tag: "KẾT QUẢ",
            title: "Thêm máy là thêm sức làm",
            body: [
              "Không giới hạn số agent. Mỗi máy chạy tối đa hai lần clone cùng lúc.",
              "Cần thêm sức thì gắn thêm máy, không phải thêm người.",
            ],
            key: "Server điều phối và ghi lại. Việc nặng chạy trên máy của mình, bằng Claude Code.",
            show: ["server", "minh", "trang", "r1", "r2", "r3", "gh"],
            focus: ["server", "r1", "r2", "r3"],
            flows: [
              { from: "server", to: "r1", kind: "request", carries: "việc", intent: "Chia việc ra các máy chạy song song" },
              { from: "server", to: "r2", kind: "request", carries: "việc" },
              { from: "server", to: "r3", kind: "request", carries: "việc", reaction: "Mỗi máy chạy tối đa hai clone cùng lúc" },
            ],
          },
        ],
      },
      {
        slug: "cau-hoi",
        title: "Những câu hỏi trước khi làm thật",
        subtitle: "Minh và Trang hỏi những câu mà ai trong team cũng sẽ hỏi. Câu nào cũng có cách xử lý.",
        minutes: 4,
        level: "Rủi ro",
        nodes: [
          { id: "minh", kind: "person", at: [-5.4, -1.6], label: "Minh", tone: "blue" },
          { id: "trang", kind: "person", at: [-5.4, 1.6], label: "Trang", tone: "orange" },
          { id: "beta", kind: "warn", at: [-1.8, -3.2], label: "Open beta", tone: "orange" },
          { id: "iso", kind: "laptop", at: [1.4, -1.6], label: "Cách ly máy agent", tone: "rust" },
          { id: "plan", kind: "agent", at: [-1.8, 1.6], label: "Gói Claude", tone: "violet" },
          { id: "video", kind: "meeting", at: [1.4, 3.2], label: "Gọi video" },
          { id: "agpl", kind: "book", at: [4.4, 0], label: "AGPL-3.0", tone: "blue" },
        ],
        steps: [
          {
            short: "Beta",
            tag: "RỦI RO",
            title: "Minh: “Đang beta, lỡ tính năng đổi thì sao?”",
            body: [
              "Điều khoản dịch vụ ghi rõ: tính năng có thể thay đổi, bị giới hạn hoặc bị bỏ.",
              "**Cách xử lý:** tự host thì mình chọn lúc nâng cấp. Thử nghiệm trên một dự án trước khi mở rộng.",
            ],
            show: ["minh", "trang", "beta"],
            focus: ["beta"],
            flows: [
              { from: "minh", to: "beta", kind: "request", carries: "câu hỏi", intent: "Đang beta, lỡ tính năng đổi thì sao?" },
              { from: "beta", to: "minh", kind: "response", carries: "cách xử lý", reaction: "Tự host thì mình chọn lúc nâng cấp" },
            ],
          },
          {
            short: "Cách ly",
            tag: "RỦI RO",
            title: "Minh: “Agent có đụng SSH key của anh không?”",
            body: [
              "Thiết kế cách ly đầy đủ (ADR 0030) vẫn ở trạng thái **Proposed**. Nếu cài runner trên laptop nhân viên, agent dùng được SSH key và tài khoản GitHub của người đó, và commit trông như của họ.",
              "**Cách xử lý:** máy hoặc VM riêng cho agent, runner ở system mode, git qua GitHub App.",
            ],
            show: ["minh", "trang", "beta", "iso"],
            focus: ["iso"],
            flows: [
              { from: "minh", to: "iso", kind: "request", carries: "câu hỏi", intent: "Agent có đụng SSH key của anh không?" },
              { from: "iso", to: "minh", kind: "response", carries: "cách xử lý", reaction: "Máy riêng, system mode, git qua GitHub App" },
            ],
          },
          {
            short: "Gói Claude",
            tag: "RỦI RO",
            title: "Trang: “Dùng gói Claude của Minh được không?”",
            body: [
              "Tài liệu của chính agentes.chat ghi: gói cá nhân dành cho chủ tài khoản, dùng để trả lời người khác có thể trái điều khoản của nhà cung cấp. Gói đăng ký còn có giới hạn dùng theo chu kỳ.",
              "**Cách xử lý:** API key của công ty hoặc gói doanh nghiệp. Kiểm lại điều khoản của Anthropic trước khi chốt.",
            ],
            show: ["minh", "trang", "beta", "iso", "plan"],
            focus: ["plan"],
            flows: [
              { from: "trang", to: "plan", kind: "request", carries: "câu hỏi", intent: "Dùng gói Claude cá nhân của Minh được không?" },
              { from: "plan", to: "trang", kind: "response", carries: "cách xử lý", reaction: "Không hợp, dùng API key của công ty" },
            ],
          },
          {
            short: "Video",
            tag: "RỦI RO",
            title: "Trang: “Họp video thì làm ở đâu?”",
            body: [
              "Không có gọi video, gọi thoại, chia sẻ màn hình hay ghi hình.",
              "**Cách xử lý:** giữ Google Meet, hoặc tự host Jitsi cho các cuộc gọi thật.",
            ],
            show: ["minh", "trang", "beta", "iso", "plan", "video"],
            focus: ["video"],
            flows: [
              { from: "trang", to: "video", kind: "request", carries: "câu hỏi", intent: "Họp video thì làm ở đâu?" },
              { from: "video", to: "trang", kind: "response", carries: "cách xử lý", reaction: "Giữ Google Meet, hoặc tự host Jitsi" },
            ],
          },
          {
            short: "AGPL",
            tag: "RỦI RO",
            title: "Câu cuối dành cho sếp: giấy phép AGPL-3.0",
            body: [
              "Dùng nội bộ thì không vướng gì. Nếu sửa mã nguồn rồi cho người ngoài công ty dùng qua mạng, phải công bố phần mã đã sửa.",
              "**Cách xử lý:** chỉ dùng nội bộ, hoặc hỏi pháp chế trước khi mở cho khách. Không câu hỏi nào ở đây chặn việc thử nghiệm, chúng chỉ quyết định cách dựng.",
            ],
            key: "Biết trước rủi ro thì dựng đúng ngay từ pilot, không phải sửa sau.",
            show: ["minh", "trang", "beta", "iso", "plan", "video", "agpl"],
            focus: ["agpl"],
            flows: [
              { from: "trang", to: "agpl", kind: "request", carries: "câu hỏi", intent: "Giấy phép AGPL có vướng gì không?" },
              { from: "agpl", to: "trang", kind: "response", carries: "cách xử lý", reaction: "Dùng nội bộ thì không vướng gì" },
            ],
          },
        ],
      },
      {
        slug: "pilot",
        title: "Pilot 2 tuần trên #web-app",
        subtitle: "Thử trên một dự án thật, đo bằng số, rồi mới quyết định.",
        minutes: 3,
        level: "Đề xuất",
        nodes: [
          { id: "minh", kind: "person", at: [-4.6, -2.8], label: "Minh", tone: "blue" },
          { id: "trang", kind: "person", at: [-1.6, -2.8], label: "Trang", tone: "orange" },
          { id: "vm", kind: "server", at: [-4.6, 0], label: "Tuần 1: dựng", tone: "green" },
          { id: "chan", kind: "chat", at: [-1.6, 0], label: "#web-app", tone: "green" },
          { id: "agents", kind: "agent", at: [1.4, 0], label: "@dev, @review, @tom-tat", tone: "violet" },
          { id: "measure", kind: "board", at: [4.4, 0], label: "Tuần 2: đo", tone: "orange" },
          { id: "decide", kind: "gate", at: [4.4, 2.8], label: "Quyết định", tone: "rust" },
        ],
        steps: [
          {
            short: "Dựng",
            tag: "CÁCH LÀM",
            title: "Tuần 1: dựng trên một VM",
            body: [
              "Tự host agentes.chat. Gắn một đến hai máy agent ở system mode. Kết nối GitHub App với một repo thật.",
            ],
            show: ["minh", "trang", "vm", "chan"],
            focus: ["vm"],
            flows: [
              { from: "minh", to: "vm", kind: "request", carries: "dựng", intent: "Tuần 1: tự host, gắn máy agent, nối GitHub" },
              { from: "vm", to: "chan", kind: "request", carries: "môi trường", intent: "Server dựng xong, mở kênh #web-app" },
            ],
          },
          {
            short: "Kênh + agent",
            tag: "CÁCH LÀM",
            title: "Một kênh thật, 2–3 agent, ngân sách cố định",
            body: [
              "Team `#web-app` chuyển trao đổi hằng ngày vào kênh, họp status chuyển thành routine tóm tắt.",
              "`@dev` viết code, `@review` review, `@tom-tat` tóm tắt mỗi sáng. Mức duyệt **Chỉ việc rủi ro**. Mỗi agent một ngân sách tháng.",
            ],
            show: ["minh", "trang", "vm", "chan", "agents"],
            focus: ["chan", "agents"],
            flows: [
              { from: "trang", to: "chan", kind: "request", carries: "việc hằng ngày", intent: "Họp status thành bản tóm tắt mỗi sáng" },
              { from: "chan", to: "agents", kind: "request", carries: "việc", reaction: "Viết code, review, và tóm tắt mỗi sáng" },
            ],
          },
          {
            short: "Đo",
            tag: "KẾT QUẢ",
            title: "Tuần 2: đo bằng số",
            body: [
              "Số cuộc họp status bỏ được. Số giờ agent làm ngoài giờ. Số PR agent mở và được merge. Số lần phải rollback. Chi phí API.",
              "Và một con số của riêng team: Hà còn phải hỏi Minh bao nhiêu lần.",
            ],
            show: ["minh", "trang", "vm", "chan", "agents", "measure"],
            focus: ["measure"],
            flows: [
              { from: "agents", to: "measure", kind: "response", carries: "số liệu", intent: "Số PR, giờ làm ngoài giờ, chi phí API" },
              { from: "trang", to: "measure", kind: "request", carries: "câu hỏi", intent: "Hà còn phải hỏi Minh mấy lần?" },
            ],
          },
          {
            short: "Quyết định",
            tag: "TÓM TẮT",
            title: "Quyết định dựa trên dữ liệu",
            body: [
              "Sau hai tuần: mở rộng, điều chỉnh, hoặc dừng.",
              "Chi phí thử: một VM và tiền API. Không có phí bản quyền.",
            ],
            key: "Hai tuần, một dự án, vài con số. Đủ để quyết định mà không phải tin vào slide.",
            show: ["minh", "trang", "vm", "chan", "agents", "measure", "decide"],
            focus: ["decide"],
            flows: [
              { from: "measure", to: "decide", kind: "request", carries: "kết quả đo", intent: "Số liệu sau hai tuần đây", reaction: "Mở rộng, điều chỉnh, hay dừng?" },
            ],
          },
        ],
      },
    ],
  },
];
