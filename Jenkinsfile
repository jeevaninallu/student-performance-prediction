
pipeline {
    agent any

    stages {
        stage('Verify Source Code') {
            steps {
                echo 'Checking project source code...'
                bat 'git rev-parse --show-toplevel'
                echo 'Source code checkout successful!'
            }
        }

        stage('Verify Docker') {
            steps {
                echo 'Checking Docker installation...'
                bat 'docker --version'
                bat 'docker compose version'
                echo 'Docker verification completed!'
            }
        }
    }
}
