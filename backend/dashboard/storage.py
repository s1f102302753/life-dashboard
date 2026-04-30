from django.core.files.storage import FileSystemStorage


class CookingPhotoStorage:
    def __init__(self) -> None:
        self.storage = FileSystemStorage()

    def save(self, photo) -> str:
        filename = self.storage.save(f"cooking-logs/{photo.name}", photo)
        return self.storage.url(filename)


class ReceiptPhotoStorage:
    def __init__(self) -> None:
        self.storage = FileSystemStorage()

    def save(self, photo) -> str:
        filename = self.storage.save(f"receipts/{photo.name}", photo)
        return self.storage.path(filename)
