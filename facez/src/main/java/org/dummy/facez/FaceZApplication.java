package org.dummy.facez;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FaceZApplication {

    public static void main(String[] args) {
        SpringApplication.run(FaceZApplication.class, args);
    }

}
