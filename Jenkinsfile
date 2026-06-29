// =============================================================================
// Todo-List-App CI/CD pipeline.
// Daemonless image builds with Buildah (no Docker, no docker.sock).
// Stages: checkout -> deps -> tests -> Gitleaks -> SonarQube + Quality Gate
//   -> Trivy FS scan -> Buildah build -> Trivy image scan -> push to ECR
//   -> update GitOps (devops-demo) -> Argo CD auto-syncs to EKS.
// Runs on a multi-container Kubernetes agent pod (one container per tool).
// =============================================================================
pipeline {
  agent {
    kubernetes {
      defaultContainer 'node'
      yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins          # EKS Pod Identity -> ECR (no static keys)
  containers:
    - name: node
      image: node:20
      command: ["sleep"]
      args: ["infinity"]
      resources:
        requests: { cpu: "200m", memory: "512Mi" }
        limits:   { memory: "1Gi" }
    - name: gitleaks
      image: zricethezav/gitleaks:latest
      command: ["sleep"]
      args: ["infinity"]
    - name: sonar
      image: sonarsource/sonar-scanner-cli:latest
      command: ["sleep"]
      args: ["infinity"]
    - name: trivy
      image: aquasec/trivy:0.55.2
      command: ["sleep"]
      args: ["infinity"]
      resources:
        requests: { cpu: "100m", memory: "512Mi" }
    - name: aws
      image: amazon/aws-cli:2.17.0
      command: ["sleep"]
      args: ["infinity"]
    - name: buildah
      image: quay.io/buildah/stable:v1.37
      command: ["sleep"]
      args: ["infinity"]
      securityContext:
        runAsUser: 0                   # rootless-IN-container; NO privileged, NO docker.sock
      env:
        - { name: STORAGE_DRIVER,    value: "vfs" }
        - { name: BUILDAH_ISOLATION, value: "chroot" }
      resources:
        requests: { cpu: "300m", memory: "768Mi" }
        limits:   { memory: "1536Mi" }
'''
    }
  }

  environment {
    AWS_REGION     = 'us-east-1'
    ECR_BACKEND    = 'devops-demo-dev-todo-backend'
    ECR_FRONTEND   = 'devops-demo-dev-todo-frontend'
    INFRA_REPO     = 'github.com/pratikpagariya/devops-demo.git'
    KUSTOMIZE_PATH = 'deployment-configs/k8s-manifests/apps/todo'
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        // Git 2.35+ refuses a workspace owned by a different UID. The agent
        // checks out as uid 1000; the 'node' container runs as root — so mark
        // the workspace safe before any raw git command runs.
        sh 'git config --global --add safe.directory "*"'
        script { env.IMAGE_TAG = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim() }
      }
    }

    stage('Resolve ECR') {
      steps {
        container('aws') {
          script {
            env.ACCOUNT_ID = sh(script: 'aws sts get-caller-identity --query Account --output text', returnStdout: true).trim()
            env.ECR = "${env.ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
          }
        }
      }
    }

    stage('Install deps') {
      steps {
        container('node') {
          sh 'cd backend  && npm ci'
          sh 'cd frontend && npm ci'
        }
      }
    }

    stage('Tests') {
      steps {
        container('node') {
          sh 'cd backend  && npm test --if-present'   // safe placeholder if no tests yet
          sh 'cd frontend && npm test --if-present'
        }
      }
    }

    stage('Gitleaks: secret scan') {
      steps {
        container('gitleaks') {
          sh 'gitleaks detect --source . --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif'
        }
      }
      post { always { archiveArtifacts artifacts: 'gitleaks.sarif', allowEmptyArchive: true } }
    }

    stage('SonarQube analysis') {
      steps {
        container('sonar') {
          withSonarQubeEnv('sonarqube') {     // provides SONAR_HOST_URL (+ server token)
            // Bind the token credential explicitly and pass it as sonar.token, so
            // it works regardless of which env var withSonarQubeEnv exports
            // (SonarScanner CLI 8.x reads sonar.token / SONAR_TOKEN).
            withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
              sh 'sonar-scanner -Dsonar.token=$SONAR_TOKEN -Dsonar.host.url=$SONAR_HOST_URL'
            }
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true   // needs SonarQube -> Jenkins webhook
        }
      }
    }

    stage('Trivy: filesystem scan') {
      steps {
        container('trivy') {
          sh 'trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed --no-progress .'
        }
      }
    }

    stage('Build images (Buildah, daemonless)') {
      steps {
        container('buildah') {
          sh """
            buildah bud  --storage-driver vfs -f backend/Containerfile  -t localhost/todo-backend:${IMAGE_TAG}  backend
            buildah bud  --storage-driver vfs -f frontend/Containerfile -t localhost/todo-frontend:${IMAGE_TAG} frontend
            buildah push --storage-driver vfs localhost/todo-backend:${IMAGE_TAG}  oci-archive:be.tar
            buildah push --storage-driver vfs localhost/todo-frontend:${IMAGE_TAG} oci-archive:fe.tar
          """
        }
      }
    }

    stage('Trivy: image scan (before push)') {
      steps {
        container('trivy') {
          sh 'trivy image --input be.tar --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed --no-progress'
          sh 'trivy image --input fe.tar --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed --no-progress'
        }
      }
    }

    stage('Push to ECR') {
      steps {
        container('aws') {
          sh "aws ecr get-login-password --region ${AWS_REGION} > ecr-token"
        }
        container('buildah') {
          sh """
            buildah login -u AWS --password-stdin ${ECR} < ecr-token
            buildah push --storage-driver vfs localhost/todo-backend:${IMAGE_TAG}  docker://${ECR}/${ECR_BACKEND}:${IMAGE_TAG}
            buildah push --storage-driver vfs localhost/todo-frontend:${IMAGE_TAG} docker://${ECR}/${ECR_FRONTEND}:${IMAGE_TAG}
            rm -f ecr-token
          """
        }
      }
    }

    stage('Update GitOps (devops-demo)') {
      steps {
        container('node') {
          withCredentials([usernamePassword(credentialsId: 'github-credentials',
                           usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
            sh """
              set -e
              rm -rf infra
              git clone https://\$GH_USER:\$GH_TOKEN@${INFRA_REPO} infra
              cd infra/${KUSTOMIZE_PATH}
              sed -i "s|ACCOUNT_ID|${ACCOUNT_ID}|g"        kustomization.yaml
              sed -i "s|newTag: .*|newTag: ${IMAGE_TAG}|g" kustomization.yaml
              git config user.email "jenkins@devops-demo"
              git config user.name  "jenkins-ci"
              git commit -am "ci(todo): deploy ${IMAGE_TAG}" || echo "no change to commit"
              git push origin HEAD:main
            """
          }
        }
      }
    }
  }

  post {
    success { echo "Pushed ${ECR_BACKEND}:${IMAGE_TAG} & ${ECR_FRONTEND}:${IMAGE_TAG} — Argo CD will sync." }
    failure { echo 'Pipeline failed — check the failing stage above.' }
  }
}
