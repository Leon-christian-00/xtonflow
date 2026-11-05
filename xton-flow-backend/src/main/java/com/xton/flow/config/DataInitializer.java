package com.xton.flow.config;

import com.xton.flow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(user -> {
            if (user.getTokenVersion() == null) {
                user.setTokenVersion(0);
                userRepository.save(user);
            }
        });
    }
}