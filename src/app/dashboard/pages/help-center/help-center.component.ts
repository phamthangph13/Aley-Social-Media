import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  faqs: FAQ[];
}

interface FAQ {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-help-center',
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class HelpCenterComponent implements OnInit {
  searchQuery: string = '';
  activeCategory: string = 'getting-started';
  activeQuestionId: string | null = null;
  
  helpCategories: HelpCategory[] = [
    {
      id: 'getting-started',
      title: 'Bắt đầu với Aley',
      icon: 'rocket',
      faqs: [
        {
          question: 'Làm thế nào để tạo tài khoản Aley?',
          answer: 'Để tạo tài khoản Aley, hãy truy cập trang đăng ký và nhập thông tin cá nhân của bạn như tên, email và mật khẩu. Sau đó, xác nhận email của bạn để kích hoạt tài khoản.'
        },
        {
          question: 'Làm thế nào để điều chỉnh thông tin cá nhân?',
          answer: 'Bạn có thể chỉnh sửa thông tin cá nhân bằng cách đi đến trang Hồ sơ, nhấp vào nút "Chỉnh sửa" và cập nhật thông tin mong muốn như tên, tiểu sử, hoặc thông tin liên hệ.'
        },
        {
          question: 'Làm thế nào để thay đổi ảnh đại diện và ảnh bìa?',
          answer: 'Trên trang Hồ sơ, bạn có thể thay đổi ảnh đại diện bằng cách nhấp vào biểu tượng máy ảnh trên ảnh hồ sơ hiện tại. Tương tự, bạn có thể thay đổi ảnh bìa bằng cách nhấp vào biểu tượng máy ảnh ở góc trên cùng của ảnh bìa.'
        }
      ]
    },
    {
      id: 'account-settings',
      title: 'Cài đặt tài khoản',
      icon: 'cog',
      faqs: [
        {
          question: 'Làm thế nào để thay đổi mật khẩu?',
          answer: 'Để thay đổi mật khẩu, hãy đi đến trang Cài đặt, chọn tab Bảo mật, nhập mật khẩu hiện tại và mật khẩu mới, sau đó nhấp vào "Đổi mật khẩu".'
        },
        {
          question: 'Làm thế nào để thay đổi email của tôi?',
          answer: 'Để thay đổi email, hãy đi đến trang Cài đặt, chọn tab Tài khoản, cập nhật địa chỉ email của bạn và nhấp vào "Lưu thay đổi". Bạn sẽ cần xác nhận email mới trước khi thay đổi có hiệu lực.'
        },
        {
          question: 'Làm thế nào để xóa tài khoản của tôi?',
          answer: 'Để xóa tài khoản, hãy đi đến trang Cài đặt, cuộn xuống cuối trang và nhấp vào "Xóa tài khoản". Bạn sẽ được yêu cầu xác nhận quyết định này. Lưu ý rằng hành động này không thể hoàn tác và tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.'
        }
      ]
    },
    {
      id: 'privacy-security',
      title: 'Quyền riêng tư & Bảo mật',
      icon: 'lock',
      faqs: [
        {
          question: 'Ai có thể xem bài đăng của tôi?',
          answer: 'Điều này phụ thuộc vào cài đặt quyền riêng tư bài đăng của bạn. Bạn có thể chọn Công khai (mọi người đều có thể xem), Chỉ bạn bè (chỉ bạn bè của bạn mới có thể xem), hoặc Chỉ mình tôi (chỉ bạn mới có thể xem). Bạn có thể đặt quyền riêng tư mặc định trong Cài đặt hoặc điều chỉnh cho từng bài đăng.'
        },
        {
          question: 'Làm thế nào để chặn một người dùng?',
          answer: 'Để chặn một người dùng, hãy đi đến trang hồ sơ của họ, nhấp vào menu ba chấm ở góc trên bên phải và chọn "Chặn người dùng". Người dùng bị chặn sẽ không thể xem hồ sơ của bạn, gửi tin nhắn hoặc kết bạn với bạn.'
        },
        {
          question: 'Làm thế nào để kiểm soát ai có thể nhắn tin cho tôi?',
          answer: 'Trong phần Cài đặt > Quyền riêng tư, bạn có thể chọn ai có thể gửi tin nhắn cho bạn. Các tùy chọn bao gồm "Tất cả mọi người", "Chỉ bạn bè", hoặc "Không ai cả". Bạn cũng có thể chặn những người dùng cụ thể để ngăn họ nhắn tin cho bạn.'
        }
      ]
    },
    {
      id: 'posts-content',
      title: 'Bài đăng & Nội dung',
      icon: 'edit',
      faqs: [
        {
          question: 'Làm thế nào để tạo một bài đăng?',
          answer: 'Để tạo bài đăng, hãy nhấp vào ô "Bạn đang nghĩ gì?" ở đầu trang chủ hoặc trang hồ sơ của bạn. Nhập nội dung của bạn, thêm hình ảnh hoặc video nếu muốn, điều chỉnh cài đặt quyền riêng tư và nhấp vào "Đăng".'
        },
        {
          question: 'Tôi có thể chỉnh sửa bài đăng sau khi đăng không?',
          answer: 'Có, bạn có thể chỉnh sửa bài đăng sau khi đăng. Nhấp vào menu ba chấm ở góc trên bên phải của bài đăng và chọn "Chỉnh sửa bài viết". Sau khi chỉnh sửa, nhấp vào "Lưu" để cập nhật bài đăng.'
        },
        {
          question: 'Làm thế nào để xóa một bài đăng?',
          answer: 'Để xóa một bài đăng, hãy nhấp vào menu ba chấm ở góc trên bên phải của bài đăng và chọn "Xóa bài viết". Bạn sẽ được yêu cầu xác nhận quyết định này. Lưu ý rằng hành động này không thể hoàn tác.'
        }
      ]
    },
    {
      id: 'friends-networking',
      title: 'Bạn bè & Kết nối',
      icon: 'users',
      faqs: [
        {
          question: 'Làm thế nào để tìm bạn bè trên Aley?',
          answer: 'Bạn có thể tìm bạn bè bằng cách sử dụng thanh tìm kiếm ở đầu trang và nhập tên của họ. Bạn cũng có thể sử dụng các bộ lọc trong trang Tìm kiếm để tìm người dùng dựa trên vị trí, sở thích hoặc kết nối chung.'
        },
        {
          question: 'Làm thế nào để gửi lời mời kết bạn?',
          answer: 'Để gửi lời mời kết bạn, hãy đi đến trang hồ sơ của người dùng và nhấp vào nút "Thêm bạn bè". Họ sẽ nhận được thông báo về lời mời của bạn và có thể chấp nhận hoặc từ chối.'
        },
        {
          question: 'Làm thế nào để hủy kết bạn với ai đó?',
          answer: 'Để hủy kết bạn với ai đó, hãy đi đến trang hồ sơ của họ, nhấp vào nút "Bạn bè" và chọn "Hủy kết bạn" từ menu thả xuống. Người dùng sẽ không được thông báo rằng bạn đã hủy kết bạn với họ.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Xử lý sự cố',
      icon: 'wrench',
      faqs: [
        {
          question: 'Tôi không thể đăng nhập vào tài khoản của mình, làm thế nào để khắc phục?',
          answer: 'Nếu bạn không thể đăng nhập, hãy thử: 1) Kiểm tra xem bạn đang sử dụng đúng email và mật khẩu, 2) Đặt lại mật khẩu bằng cách nhấp vào "Quên mật khẩu" trên trang đăng nhập, 3) Xóa cookie và bộ nhớ cache của trình duyệt, hoặc 4) Liên hệ với bộ phận hỗ trợ nếu vấn đề vẫn tiếp diễn.'
        },
        {
          question: 'Ứng dụng của tôi bị đóng đột ngột, làm thế nào để khắc phục?',
          answer: 'Nếu ứng dụng đóng đột ngột, hãy thử: 1) Cập nhật ứng dụng lên phiên bản mới nhất, 2) Khởi động lại thiết bị của bạn, 3) Gỡ cài đặt và cài đặt lại ứng dụng, hoặc 4) Liên hệ với bộ phận hỗ trợ với các chi tiết về thiết bị và phiên bản ứng dụng của bạn.'
        },
        {
          question: 'Tôi không nhận được thông báo, làm thế nào để khắc phục?',
          answer: 'Nếu bạn không nhận được thông báo, hãy kiểm tra: 1) Cài đặt thông báo trong ứng dụng Aley, 2) Cài đặt thông báo trong thiết bị của bạn cho ứng dụng Aley, 3) Kết nối internet của bạn, hoặc 4) Khởi động lại ứng dụng hoặc thiết bị của bạn.'
        }
      ]
    }
  ];
  
  popularQuestions: FAQ[] = [
    {
      question: 'Làm thế nào để bảo vệ tài khoản của tôi?',
      answer: 'Để bảo vệ tài khoản của bạn: 1) Sử dụng mật khẩu mạnh và duy nhất, 2) Bật xác thực hai yếu tố, 3) Đừng chia sẻ thông tin đăng nhập với bất kỳ ai, 4) Đăng xuất khi sử dụng máy tính công cộng, và 5) Thường xuyên kiểm tra hoạt động tài khoản của bạn.'
    },
    {
      question: 'Tôi quên mật khẩu của mình, làm thế nào để khôi phục tài khoản?',
      answer: 'Để khôi phục mật khẩu, hãy nhấp vào liên kết "Quên mật khẩu" trên trang đăng nhập, nhập địa chỉ email của bạn và làm theo hướng dẫn được gửi đến email của bạn để đặt lại mật khẩu của bạn.'
    },
    {
      question: 'Làm thế nào để báo cáo nội dung lạm dụng hoặc không phù hợp?',
      answer: 'Để báo cáo nội dung, hãy nhấp vào menu ba chấm bên cạnh bài đăng, bình luận hoặc tin nhắn và chọn "Báo cáo". Chọn lý do báo cáo và gửi. Đội ngũ của chúng tôi sẽ xem xét báo cáo và thực hiện hành động thích hợp.'
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;
    this.activeQuestionId = null;
  }

  toggleQuestion(questionId: string): void {
    if (this.activeQuestionId === questionId) {
      this.activeQuestionId = null;
    } else {
      this.activeQuestionId = questionId;
    }
  }

  isQuestionActive(questionId: string): boolean {
    return this.activeQuestionId === questionId;
  }

  searchFAQs(): void {
    if (!this.searchQuery.trim()) {
      return;
    }
    // TODO: Implement search functionality
  }
} 