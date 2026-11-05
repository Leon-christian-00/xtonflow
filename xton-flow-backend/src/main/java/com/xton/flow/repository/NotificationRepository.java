package com.xton.flow.repository;

import com.xton.flow.model.Notification;
import com.xton.flow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    
    List<Notification> findByRecipientAndStatusOrderByCreatedAtDesc(User recipient, Notification.NotificationStatus status);
    
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipient = :recipient AND n.status = 'UNREAD'")
    Long countUnreadNotifications(@Param("recipient") User recipient);
    
    List<Notification> findByRecipientAndBoardIdOrderByCreatedAtDesc(User recipient, String boardId);
    void deleteByTaskId(String taskId);
    void deleteByBoardId(String boardId);
}