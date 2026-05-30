import torch
import torch.nn as nn

class CNN(nn.Module):
    def __init__(self, num_classes=3):
        super(CNN, self).__init__()

        # feature extractor
        self.features = nn.Sequential(
            # Block 1 — (6, 32, 35) - prvi layer CNNa, 3x3 filter vrne 32 feature mapov
            nn.Conv2d(6, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32), # normaliziramo feature mape
            nn.ReLU(), 
            nn.MaxPool2d(2),                          # → (32, 16, 17)

            # Block 2
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),                          # → (64, 8, 8)

            # Block 3
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((2, 2)),             # → (128, 2, 2)
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),                             # → 512
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x