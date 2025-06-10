.PHONY: test test-cov test-watch clean

# Run tests once and stop
test:
	docker compose --profile test up test --build --abort-on-container-exit

run:
	docker compose up api --build 

clean:
	docker compose down -v
	docker compose --profile test down -v